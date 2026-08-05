import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { EventCreationSaveStatus, EventCreationState } from '@/entities/event/model/types';
import { validateCompleteEvent } from '@/features/create-event/model/eventCreationValidation';
import { useEventCreationViewModel } from '@/features/create-event/model/useCreateEvent';
import { EventDraftApiError, eventDraftService, resolveDraftRestore } from '@/services/api/EventDraftService';
import { eventService } from '@/services/api/EventService';
import { supabase } from '@/shared/lib/supabase';

type ViewModel = ReturnType<typeof useEventCreationViewModel>;
type EventCreationContextType = ViewModel & {
    draftId: string | null;
    draftReady: boolean;
    saveStatus: EventCreationSaveStatus;
    currentStep: number;
    setCurrentStep: (step: number) => void;
    flushDraft: () => Promise<void>;
    discardDraft: () => Promise<void>;
    publishDraft: () => Promise<Awaited<ReturnType<typeof eventDraftService.publish>>>;
};

const EventCreationContext = createContext<EventCreationContextType | null>(null);

export function EventCreationProvider({ children, enableDrafts = false }: { children: ReactNode; enableDrafts?: boolean }) {
    const viewModel = useEventCreationViewModel();
    const params = useLocalSearchParams<{ draftId?: string | string[] }>();
    const requestedDraftId = Array.isArray(params.draftId) ? params.draftId[0] : params.draftId;
    const [draftId, setDraftId] = useState<string | null>(null);
    const [draftReady, setDraftReady] = useState(!enableDrafts);
    const [saveStatus, setSaveStatus] = useState<EventCreationSaveStatus>('idle');
    const [currentStep, setCurrentStepState] = useState(0);
    const draftIdRef = useRef<string | null>(null);
    const revisionRef = useRef(0);
    const savedCoverRef = useRef<string | null>(null);
    const publishKeyRef = useRef<string | null>(null);
    const dataRef = useRef(viewModel.data);
    const stepRef = useRef(0);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
    const draftClosedRef = useRef(false);
    const initializedRef = useRef(false);
    const replaceDataRef = useRef(viewModel.replaceData);
    const resetRef = useRef(viewModel.reset);

    dataRef.current = viewModel.data;
    stepRef.current = currentStep;
    replaceDataRef.current = viewModel.replaceData;
    resetRef.current = viewModel.reset;

    useEffect(() => {
        if (!enableDrafts || initializedRef.current) return;
        initializedRef.current = true;
        let active = true;

        void (async () => {
            if (requestedDraftId) {
                draftIdRef.current = requestedDraftId;
                setDraftId(requestedDraftId);
            }
            const localDraft = await eventDraftService.loadLocal(requestedDraftId ?? null);
            if (active && localDraft) {
                revisionRef.current = localDraft.revision;
                setCurrentStepState(localDraft.currentStep);
                replaceDataRef.current(eventDraftService.hydrate(localDraft.payload));
            }
            try {
                let draft = requestedDraftId
                    ? await eventDraftService.get(requestedDraftId)
                    : await eventDraftService.create(localDraft?.payload ?? eventDraftService.serialize(dataRef.current));
                if (!requestedDraftId && localDraft && localDraft.currentStep !== draft.currentStep) {
                    draft = await eventDraftService.update(
                        draft.id,
                        localDraft.payload,
                        localDraft.currentStep,
                        draft.revision,
                    );
                }
                if (!active) return;
                const restored = resolveDraftRestore(draft, localDraft, !!requestedDraftId);
                setDraftId(draft.id);
                draftIdRef.current = draft.id;
                revisionRef.current = draft.revision;
                setCurrentStepState(restored.currentStep);
                if (Object.keys(restored.payload).length > 0) {
                    replaceDataRef.current(eventDraftService.hydrate(restored.payload));
                }
                const savedDetails = restored.payload.details as { coverImage?: string | null } | undefined;
                savedCoverRef.current = savedDetails?.coverImage ?? null;
                await eventDraftService.saveLocal(draft.id, restored.payload, restored.currentStep, draft.revision);
                if (!requestedDraftId) await eventDraftService.removeLocal(null);
                setSaveStatus(restored.needsSync ? 'saving' : 'saved');
            } catch (error) {
                if (!active) return;
                setSaveStatus(error instanceof TypeError ? 'offline' : 'error');
            } finally {
                if (active) setDraftReady(true);
            }
        })();

        return () => { active = false; };
    }, [enableDrafts, requestedDraftId]);

    const persistSnapshot = useCallback(async (snapshot: EventCreationState, step: number) => {
        if (!enableDrafts || draftClosedRef.current) return;
        setSaveStatus('saving');

        const serializedSnapshot = eventDraftService.serialize(snapshot);
        await eventDraftService.saveLocal(
            draftIdRef.current,
            serializedSnapshot,
            step,
            revisionRef.current,
        );

        let activeDraftId = draftIdRef.current;
        if (!activeDraftId) {
            const created = await eventDraftService.create(serializedSnapshot);
            activeDraftId = created.id;
            draftIdRef.current = created.id;
            setDraftId(created.id);
            revisionRef.current = created.revision;
            await eventDraftService.promoteLocal(null, created.id);
        }

        let nextSnapshot = snapshot;
        let uploadedCover: string | null = null;
        const cover = snapshot.details.coverImage;
        if (cover && !/^https?:\/\//i.test(cover)) {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new EventDraftApiError('Sessão expirada', 'UNAUTHORIZED');
            uploadedCover = await eventService.uploadImage(cover, session.user.id, activeDraftId);
            nextSnapshot = {
                ...snapshot,
                details: { ...snapshot.details, coverImage: uploadedCover },
            };
        }

        let updated;
        try {
            updated = await eventDraftService.update(
                activeDraftId,
                eventDraftService.serialize(nextSnapshot),
                step,
                revisionRef.current,
            );
        } catch (error) {
            if (uploadedCover) await eventService.deleteUploadedImage(uploadedCover);
            throw error;
        }

        const previousCover = savedCoverRef.current;
        const nextCover = nextSnapshot.details.coverImage;
        savedCoverRef.current = nextCover;
        if (uploadedCover && dataRef.current.details.coverImage === cover) {
            const currentData = dataRef.current;
            const dataWithUploadedCover = {
                ...currentData,
                details: { ...currentData.details, coverImage: uploadedCover },
            };
            dataRef.current = dataWithUploadedCover;
            replaceDataRef.current(dataWithUploadedCover);
        }
        if (previousCover && previousCover !== nextCover) {
            await eventService.deleteUploadedImage(previousCover);
        }
        revisionRef.current = updated.revision;
        await eventDraftService.saveLocal(activeDraftId, updated.payload, updated.currentStep, updated.revision);
        setSaveStatus('saved');
    }, [enableDrafts]);

    const enqueueSave = useCallback((snapshot: EventCreationState, step: number) => {
        const currentSave = saveQueueRef.current
            .catch(() => undefined)
            .then(() => persistSnapshot(snapshot, step));
        saveQueueRef.current = currentSave.catch((error) => {
                setSaveStatus(error instanceof TypeError ? 'offline' : 'error');
            });
        return currentSave;
    }, [persistSnapshot]);

    useEffect(() => {
        if (!enableDrafts || !draftReady || draftClosedRef.current) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        setSaveStatus('saving');
        saveTimerRef.current = setTimeout(() => {
            void enqueueSave(dataRef.current, stepRef.current).catch(() => undefined);
        }, 850);
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [viewModel.data, currentStep, draftReady, enableDrafts, enqueueSave]);

    const flushDraft = useCallback(async () => {
        if (!enableDrafts) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        try {
            await enqueueSave(dataRef.current, stepRef.current);
        } catch {
            // The local snapshot is already persisted; cloud status is shown in the header.
        }
    }, [enableDrafts, enqueueSave]);

    useEffect(() => {
        if (!enableDrafts) return;
        const subscription = AppState.addEventListener('change', (state) => {
            if (state !== 'active' || saveStatus === 'offline') void flushDraft().catch(() => undefined);
        });
        return () => subscription.remove();
    }, [enableDrafts, flushDraft, saveStatus]);

    const setCurrentStep = useCallback((step: number) => {
        stepRef.current = step;
        setCurrentStepState(step);
    }, []);

    const discardDraft = useCallback(async () => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        await saveQueueRef.current.catch(() => undefined);
        draftClosedRef.current = true;
        try {
            const activeDraftId = draftIdRef.current;
            if (activeDraftId) await eventDraftService.delete(activeDraftId);
            const cover = dataRef.current.details.coverImage;
            if (cover) await eventService.deleteUploadedImage(cover);
            await eventDraftService.removeLocal(activeDraftId);
            if (!activeDraftId) await eventDraftService.removeLocal(null);
            resetRef.current();
            draftIdRef.current = null;
            setDraftId(null);
        } catch (error) {
            draftClosedRef.current = false;
            throw error;
        }
    }, []);

    const publishDraft = useCallback(async () => {
        const errors = validateCompleteEvent(dataRef.current);
        if (Object.keys(errors).length > 0) {
            throw new EventDraftApiError('Revise os campos destacados', 'INVALID_EVENT', errors, 422);
        }
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        await enqueueSave(dataRef.current, stepRef.current);
        const activeDraftId = draftIdRef.current;
        if (!activeDraftId) {
            throw new EventDraftApiError('Conecte-se para sincronizar o rascunho antes de publicar', 'DRAFT_NOT_SYNCED');
        }
        publishKeyRef.current ??= Crypto.randomUUID();
        const event = await eventDraftService.publish(activeDraftId, publishKeyRef.current);
        await eventDraftService.removeLocal(activeDraftId);
        draftClosedRef.current = true;
        publishKeyRef.current = null;
        draftIdRef.current = null;
        setDraftId(null);
        resetRef.current();
        return event;
    }, [enqueueSave]);

    return (
        <EventCreationContext.Provider value={{
            ...viewModel,
            draftId,
            draftReady,
            saveStatus,
            currentStep,
            setCurrentStep,
            flushDraft,
            discardDraft,
            publishDraft,
        }}>
            {children}
        </EventCreationContext.Provider>
    );
}

export function useEventCreation() {
    const context = useContext(EventCreationContext);
    if (!context) throw new Error('useEventCreation must be used within an EventCreationProvider');
    return context;
}
