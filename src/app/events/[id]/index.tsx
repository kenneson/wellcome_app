import { ReportSheet } from '@/components/ui/ReportSheet';
import { Event } from '@/entities/event/types';
import { ReviewForm } from '@/features/reviews/ReviewForm';
import { ReviewList } from '@/features/reviews/ReviewList';
import { eventService } from '@/services/api/EventService';
import { reviewService } from '@/services/api/ReviewService';
import { DEFAULT_AVATAR_PLACEHOLDER, DEFAULT_PLACEHOLDER_IMAGE } from '@/shared/lib/styles';
import { supabase } from '@/shared/lib/supabase';
import { isEventRegistrationClosed } from '@/shared/lib/eventAvailability';
import { formatPrice } from '@/utils/formatters';
import { getOptimizedImageUrl } from '@/utils/imageOptimizer';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Share, Text, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Map facilities/rules to icons/labels
const FACILITY_ICONS: Record<string, { icon: string, label: string }> = {
    'parking': { icon: 'car-outline', label: 'Estacionamento para visitantes' },
    'elevator': { icon: 'business-outline', label: 'Edifício com elevador' },
    'ac': { icon: 'snow-outline', label: 'Ar condicionado' },
    'wifi': { icon: 'wifi-outline', label: 'Wi-Fi disponível' },
    'accessibility': { icon: 'body-outline', label: 'Acessibilidade' },
    'public_transport': { icon: 'bus-outline', label: 'Próximo a transporte público' },
    'pet_friendly': { icon: 'paw-outline', label: 'Aceita animais' },
    'smoking_allowed': { icon: 'color-filter-outline', label: 'Permitido fumar' },
};

const RULE_ICONS: Record<string, { icon: string, label: string, positive: boolean }> = {
    'no_smoking': { icon: 'close-circle-outline', label: 'Não é permitido fumar', positive: false },
    'no_pets': { icon: 'close-circle-outline', label: 'Não aceito animais', positive: false },
    'no_shoes': { icon: 'footsteps-outline', label: 'Retirar sapatos ao entrar', positive: true },
};

export default function EventDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [isParticipant, setIsParticipant] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [participantCount, setParticipantCount] = useState(0);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [myBookingStatus, setMyBookingStatus] = useState<string | null>(null);
    const [myBookingId, setMyBookingId] = useState<string | null>(null);
    const [reportVisible, setReportVisible] = useState(false);

    const isPastEvent = React.useMemo(() => {
        if (!event) return false;
        const eventTime = new Date(event.endTime || event.eventDate).getTime();
        return eventTime < Date.now();
    }, [event]);

    const registrationClosed = React.useMemo(
        () => event ? isEventRegistrationClosed(event) : false,
        [event]
    );

    const userHasReviewed = React.useMemo(() => {
        if (!event?.reviews || !currentUserId) return false;
        return event.reviews.some(r => r.userId === currentUserId);
    }, [event, currentUserId]);

    useEffect(() => {
        if (id) fetchEventDetails();
    }, [id]);

    async function fetchEventDetails() {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            setCurrentUserId(userId || null);

            const eventData = await eventService.getEventById(id as string);
            setEvent(eventData);
            setParticipantCount(eventData.participantCount ?? 0);

            if (userId && eventData.hostId === userId) {
                setIsHost(true);
            }

            if (userId && eventData.bookings) {
                const myParticipation = eventData.bookings.find(b => b.userId === userId);
                setIsParticipant(!!myParticipation);
                setMyBookingStatus(myParticipation?.status || null);
                setMyBookingId(myParticipation?.id || null);
            } else {
                setIsParticipant(false);
                setMyBookingStatus(null);
                setMyBookingId(null);
            }

        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível carregar o evento.');
            router.back();
        } finally {
            setLoading(false);
        }
    }

    async function handleJoin() {
        if (!event) return;
        if (registrationClosed) {
            Alert.alert('Inscricoes encerradas', 'O prazo para participar deste evento terminou.');
            return;
        }
        router.push(`/events/${id}/join`);
    }

    const openMaps = async () => {
        if (!event?.latitude || !event?.longitude) return;

        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${event.latitude},${event.longitude}`;
        const label = event.title;
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });

        if (url) {
            try {
                const supported = await Linking.canOpenURL(url);
                if (supported) {
                    await Linking.openURL(url);
                } else {
                    Alert.alert('Erro', 'Não foi possível abrir o mapa.');
                }
            } catch (error) {
                Alert.alert('Erro', 'Ocorreu um erro ao tentar abrir o mapa.');
            }
        }
    };

    const handleContactHost = async () => {
        if (!event?.host?.phoneNumber) {
            Alert.alert('Indisponível', 'O anfitrião não cadastrou um telefone de contato.');
            return;
        }

        let phone = event.host.phoneNumber.replace(/\D/g, '');
        // Simple heuristic for BR numbers: if 10 or 11 digits, prepend 55
        if (phone.length === 10 || phone.length === 11) {
            phone = `55${phone}`;
        }
        
        const message = `Olá ${event.host.fullName ? event.host.fullName.split(' ')[0] : 'Anfitrião'}, vi seu evento "${event.title}" no Wellcome e gostaria de tirar uma dúvida.`;
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Confira este evento: ${event?.title} no Wellcome!`,
            });
        } catch (error) {
            // ignore
        }
    };

    const handleCreateReview = async (rating: number, comment: string) => {
        if (!event || !currentUserId) return;
        
        try {
            setSubmittingReview(true);
            await reviewService.create({
                eventId: event.id,
                userId: currentUserId,
                rating,
                comment
            });
            
            Alert.alert('Sucesso', 'Sua avaliação foi enviada!');
            await fetchEventDetails();
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Não foi possível enviar a avaliação');
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleDeleteReview = (reviewId: string) => {
        if (!currentUserId) return;

        Alert.alert(
            'Excluir avaliação',
            'Tem certeza que deseja excluir sua avaliação?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { 
                    text: 'Excluir', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await reviewService.delete(reviewId, currentUserId);
                            await fetchEventDetails();
                        } catch (error: any) {
                            Alert.alert('Erro', 'Não foi possível excluir a avaliação');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#FF8C42" />
            </View>
        );
    }

    if (!event) return null;

    const date = new Date(event.eventDate);
    const spotsAvailable = Math.max(0, event.maxGuests - participantCount);
    const isFull = spotsAvailable === 0;
    const hostName = event.host?.fullName || event.host?.username || 'Anfitrião';
    const optimizedCoverImage = getOptimizedImageUrl(event.coverImageUrl, { width: 800 });
    const optimizedHostAvatar = getOptimizedImageUrl(event.host?.avatarUrl, { width: 100 });
    
    // Group dishes by category
    const groupedDishes = event.dishes?.reduce((acc: any, dish) => {
        const cat = dish.category || 'OUTROS';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(dish);
        return acc;
    }, {});

    const categoryOrder = ['ENTRADA', 'PRATO_PRINCIPAL', 'SOBREMESA', 'BEBIDA'];
    const sortedCategories = Object.keys(groupedDishes || {}).sort((a, b) => {
        const idxA = categoryOrder.indexOf(a);
        const idxB = categoryOrder.indexOf(b);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="light" />
            <KeyboardAwareScrollView
                enableOnAndroid={true}
                extraScrollHeight={40}
                extraHeight={120}
                enableResetScrollToCoords={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 100 }}
                style={{ flex: 1 }}
            >
                {/* Hero Image */}
                <View className="relative h-[300px] w-full">
                    <Image
                        source={{ uri: optimizedCoverImage || DEFAULT_PLACEHOLDER_IMAGE }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                    />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.3)', 'transparent']}
                        className="absolute top-0 left-0 right-0 h-24"
                    />
                    
                    {/* Header Buttons */}
                    <View 
                        className="absolute w-full flex-row justify-between px-4" 
                        style={{ top: insets.top + 10 }}
                    >
                        <TouchableOpacity 
                            onPress={() => router.back()} 
                            className="w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm"
                            activeOpacity={0.8}
                        >
                            <Ionicons name="chevron-back" size={24} color="#FF8C42" />
                        </TouchableOpacity>
                        <View className="flex-row gap-2">
                            {!isHost && (
                                <TouchableOpacity
                                    onPress={() => setReportVisible(true)}
                                    className="w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm"
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="flag-outline" size={22} color="#DC2626" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={handleShare}
                                className="w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm"
                                activeOpacity={0.8}
                            >
                                <Ionicons name="share-outline" size={24} color="#FF8C42" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View className="px-5 pt-6 pb-8 -mt-6 bg-white rounded-t-[32px]">
                    {/* Title */}
                    <Text className="text-[24px] font-bold text-[#1A1A1A] leading-tight mb-4">
                        {event.title}
                    </Text>

                    {/* Host Mini Profile */}
                    <View className="flex-row items-center mb-8">
                        <Image
                            source={{ uri: optimizedHostAvatar || DEFAULT_AVATAR_PLACEHOLDER }}
                            style={{ width: 48, height: 48, borderRadius: 24 }}
                            className="border-2 border-white shadow-sm"
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        />
                        <View className="ml-3 flex-1">
                            <View className="flex-row items-center">
                                <Text className="text-base font-bold text-[#1A1A1A] mr-1">
                                    {hostName}
                                </Text>
                                <Ionicons name="checkmark-circle" size={16} color="#FF8C42" />
                            </View>
                            <Text className="text-sm text-gray-500">
                                {event.location || event.host?.neighborhood || 'Localização não informada'}
                            </Text>
                        </View>
                    </View>

                    {/* Info Grid */}
                    <View className="flex-row flex-wrap gap-3 mb-8">
                        {/* Spots */}
                        <View className="w-[48%] bg-gray-50 p-4 rounded-2xl">
                            <View className="flex-row items-center mb-2">
                                <View className="flex-row -space-x-2 mr-2">
                                    <Image source={{ uri: DEFAULT_AVATAR_PLACEHOLDER }} className="w-6 h-6 rounded-full border border-white" />
                                    <View className="w-6 h-6 rounded-full bg-gray-200 border border-white items-center justify-center">
                                        <Ionicons name="person" size={12} color="#9CA3AF" />
                                    </View>
                                </View>
                            </View>
                            <Text className="text-base font-bold text-[#1A1A1A]">{event.maxGuests} lugares</Text>
                            <View className="flex-row items-center mt-1">
                                <Text className="text-xs text-orange-500 font-medium mr-1">{spotsAvailable} disponíveis</Text>
                                <Ionicons name="information-circle-outline" size={12} color="#FF8C42" />
                            </View>
                        </View>

                        {/* Price */}
                        <View className="w-[48%] bg-gray-50 p-4 rounded-2xl justify-center">
                            <Text className="text-[20px] font-bold text-[#1A1A1A]">{formatPrice(event.price)}</Text>
                            <Text className="text-xs text-gray-500 mt-1">por convidado</Text>
                        </View>

                        {/* Type/Time */}
                        <View className="w-[48%] bg-gray-50 p-4 rounded-2xl">
                            <Ionicons name="restaurant-outline" size={24} color="#1A1A1A" className="mb-3" />
                            <Text className="text-sm font-bold text-[#1A1A1A] mb-1">
                                {event.eventType || 'Evento'}
                            </Text>
                            <Text className="text-xs text-gray-500">
                                {event.endTime 
                                    ? `das ${new Date(event.eventDate).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})} às ${new Date(event.endTime).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`
                                    : 'Horário a definir'}
                            </Text>
                        </View>

                        {/* Date */}
                        <View className="w-[48%] bg-gray-50 p-4 rounded-2xl">
                            <Ionicons name="calendar-outline" size={24} color="#1A1A1A" className="mb-3" />
                            <Text className="text-sm font-bold text-[#1A1A1A] mb-1">
                                {date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                            </Text>
                            <Text className="text-xs text-gray-500">
                                {event.reservationDeadline 
                                    ? `Reservas até ${new Date(event.reservationDeadline).toLocaleDateString('pt-BR', { day: 'numeric', month: '2-digit' })}`
                                    : 'Sem prazo'}
                            </Text>
                        </View>
                    </View>

                    {/* Description */}
                    <View className="mb-8">
                        <Text className="text-[18px] font-bold text-[#1A1A1A] mb-3">O evento</Text>
                        <Text className="text-base text-gray-600 leading-6">
                            {event.description}
                        </Text>
                    </View>

                    {/* Menu */}
                    <View className="mb-8">
                        <Text className="text-[18px] font-bold text-[#1A1A1A] mb-6">Cardápio</Text>
                        
                        {sortedCategories.length > 0 ? (
                            <View className="pl-2">
                                {sortedCategories.map((category, idx) => (
                                    <View key={category} className="mb-6 relative pl-6 border-l-2 border-orange-100">
                                        <View className="absolute -left-[5px] top-0 w-[8px] h-[8px] rounded-full bg-[#FF8C42]" />
                                        <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                            {category.replace('_', ' ')}
                                        </Text>
                                        {groupedDishes[category].map((dish: any, dishIdx: number) => (
                                            <View key={dishIdx} className="mb-4 last:mb-0">
                                                <Text className="text-base font-bold text-[#1A1A1A] mb-1">
                                                    {dish.name}
                                                </Text>
                                                {dish.description && (
                                                    <Text className="text-sm text-gray-500 leading-5">
                                                        {dish.description}
                                                    </Text>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text className="text-sm text-gray-500 italic mb-4">O cardápio ainda não foi definido pelo anfitrião.</Text>
                        )}

                        {/* Dietary Options */}
                        <View className="bg-gray-50 rounded-xl p-4 mt-2 space-y-2">
                            {event.dietaryOptions?.map((option, idx) => (
                                <View key={idx} className="flex-row items-center">
                                    <Ionicons name="checkmark" size={16} color="#1A1A1A" />
                                    <Text className="text-xs text-gray-600 ml-2 font-medium">{option}</Text>
                                </View>
                            ))}
                            {(!event.dietaryOptions || event.dietaryOptions.length === 0) && (
                                <Text className="text-xs text-gray-400 italic">Nenhuma opção dietética específica informada.</Text>
                            )}
                        </View>
                    </View>

                    {/* Host Full Profile */}
                    <View className="mb-8">
                        <Text className="text-[18px] font-bold text-[#1A1A1A] mb-4">Seu Anfitrião(a)</Text>
                        <View className="bg-[#FFF5F0] rounded-2xl p-5">
                            <View className="flex-row items-start justify-between mb-6">
                                <View className="flex-row items-center">
                                    <Image
                                        source={{ uri: optimizedHostAvatar || DEFAULT_AVATAR_PLACEHOLDER }}
                                        style={{ width: 64, height: 64, borderRadius: 32 }}
                                        contentFit="cover"
                                    />
                                    <View className="ml-3">
                                        <Text className="text-sm text-gray-500 mb-0.5">Olá, eu sou</Text>
                                        <Text className="text-base font-bold text-[#1A1A1A] mb-1">
                                            {hostName.split(' ')[0]} {hostName.split(' ')[1] || ''}
                                        </Text>
                                        {event.host?.isSuperhost && (
                                            <View className="bg-[#FF8C42] px-2 py-0.5 rounded-full self-start">
                                                <Text className="text-[10px] font-bold text-white uppercase">Superhost</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                                <View className="bg-white px-2 py-1 rounded-lg flex-row items-center shadow-sm">
                                    <Ionicons name="star" size={14} color="#FF8C42" />
                                    <Text className="text-xs font-bold text-[#1A1A1A] ml-1">4.9</Text>
                                </View>
                            </View>

                            <View className="space-y-3 mb-6">
                                {event.host?.birthDecade && (
                                    <View className="flex-row items-center">
                                        <Ionicons name="star-outline" size={18} color="#FF8C42" />
                                        <Text className="text-sm text-gray-600 ml-3 font-light">{event.host.birthDecade}</Text>
                                    </View>
                                )}
                                {event.host?.occupation && (
                                    <View className="flex-row items-center">
                                        <Ionicons name="briefcase-outline" size={18} color="#FF8C42" />
                                        <Text className="text-sm text-gray-600 ml-3 font-light">Trabalho: {event.host.occupation}</Text>
                                    </View>
                                )}
                                {event.host?.pets && (
                                    <View className="flex-row items-center">
                                        <Ionicons name="paw-outline" size={18} color="#FF8C42" />
                                        <Text className="text-sm text-gray-600 ml-3 font-light">{event.host.pets}</Text>
                                    </View>
                                )}
                                {event.host?.languages && event.host.languages.length > 0 && (
                                    <View className="flex-row items-center">
                                        <Ionicons name="chatbubble-outline" size={18} color="#FF8C42" />
                                        <Text className="text-sm text-gray-600 ml-3 font-light">Fala: {event.host.languages.join(', ')}</Text>
                                    </View>
                                )}
                            </View>

                            <Text className="text-sm text-gray-600 leading-6 mb-6 font-light">
                                {event.host?.bio || `Sou ${hostName}, adoro receber pessoas e cozinhar!`}
                            </Text>

                            {/* Contact Host Button */}
                            {!isHost && event.host?.phoneNumber && (
                                <TouchableOpacity 
                                    className="bg-[#25D366] mt-4 flex-row items-center justify-center py-3 rounded-xl shadow-sm"
                                    onPress={handleContactHost}
                                >
                                    <Ionicons name="logo-whatsapp" size={20} color="white" />
                                    <Text className="text-white font-bold ml-2">Conversar com anfitriã(o)</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Reviews Section */}
                    <View className="mb-8">
                        <Text className="text-[18px] font-bold text-[#1A1A1A] mb-4">
                            Avaliações ({event.reviews?.length || 0})
                        </Text>
                        
                        {isParticipant && !isHost && !userHasReviewed && isPastEvent && (
                            <ReviewForm 
                                onSubmit={handleCreateReview} 
                                loading={submittingReview} 
                            />
                        )}

                        <ReviewList 
                            reviews={event.reviews || []} 
                            onDelete={handleDeleteReview}
                            currentUserId={currentUserId || undefined}
                        />
                    </View>

                    {/* Location */}
                    <View className="mb-8">
                        <Text className="text-[18px] font-bold text-[#1A1A1A] mb-4">Sobre o local</Text>
                        
                        <TouchableOpacity 
                            className="h-[180px] bg-gray-100 rounded-2xl mb-4 overflow-hidden relative border border-gray-200"
                            activeOpacity={0.9}
                            onPress={openMaps}
                        >
                            <View className="absolute inset-0 items-center justify-center bg-[#E5E7EB]">
                                <Ionicons name="map" size={40} color="#9CA3AF" />
                                <Text className="text-gray-500 mt-2 text-sm">Ver no mapa</Text>
                            </View>
                            <View className="absolute inset-0 items-center justify-center">
                                <View className="w-10 h-10 bg-[#FF8C42] rounded-full items-center justify-center border-4 border-white shadow-lg">
                                    <Ionicons name="location" size={20} color="white" />
                                </View>
                            </View>
                        </TouchableOpacity>
                        
                        <TouchableOpacity onPress={openMaps} className="flex-row items-center mb-6">
                            <Text className="text-sm text-gray-500 italic flex-1">
                                {event.location || event.host?.neighborhood}, Florianópolis
                            </Text>
                            <Ionicons name="navigate-circle-outline" size={20} color="#FF8C42" />
                        </TouchableOpacity>

                        <View className="space-y-2">
                            {(event.facilities || []).map((facility, idx) => {
                                // Simple mapping logic if keys are used, otherwise use text directly
                                const mapped = FACILITY_ICONS[facility] || { icon: 'checkmark-circle-outline', label: facility };
                                return (
                                    <View key={idx} className="flex-row items-center">
                                        <Ionicons name={mapped.icon as any} size={16} color="#4B5563" />
                                        <Text className="text-xs text-gray-600 ml-2">{mapped.label}</Text>
                                    </View>
                                );
                            })}
                            
                            {(event.rules || []).map((rule, idx) => {
                                const mapped = RULE_ICONS[rule] || { icon: 'alert-circle-outline', label: rule, positive: false };
                                return (
                                    <View key={idx} className="flex-row items-center">
                                        <Ionicons name={mapped.icon as any} size={16} color={mapped.positive ? '#10B981' : '#EF4444'} />
                                        <Text className="text-xs text-gray-600 ml-2">{mapped.label}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </KeyboardAwareScrollView>

            {/* Action Bar - Participant: Resume pending payment */}
            {!isHost && isParticipant && myBookingStatus === 'PENDING' && Number(event.price) > 0 && myBookingId && (
                <View className="absolute bottom-0 left-0 right-0 bg-white px-4 py-4 border-t border-gray-100 pb-8">
                    <TouchableOpacity
                        className="bg-[#FF8C42] py-3.5 rounded-2xl shadow-sm flex-row items-center justify-center"
                        onPress={() => router.push(`/events/${id}/payment?bookingId=${myBookingId}`)}
                    >
                        <Ionicons name="card-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text className="text-white font-bold text-[16px]">Continuar pagamento</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Action Bar - Participant: View Ticket (approved) */}
            {isParticipant && myBookingStatus === 'APPROVED' && (
                <View className="absolute bottom-0 left-0 right-0 bg-white px-4 py-4 border-t border-gray-100 pb-8">
                    <TouchableOpacity
                        className="bg-[#FF8C42] py-3.5 rounded-2xl shadow-sm flex-row items-center justify-center"
                        onPress={() => router.push(`/events/${id}/ticket`)}
                    >
                        <Ionicons name="qr-code-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text className="text-white font-bold text-[16px]">Ver Ingresso</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Action Bar - Host: Scan Tickets */}
            {isHost && (
                <View className="absolute bottom-0 left-0 right-0 bg-white px-4 py-4 border-t border-gray-100 pb-8">
                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            className="flex-1 bg-[#FF8C42] py-3.5 rounded-2xl shadow-sm flex-row items-center justify-center"
                            onPress={() => router.push(`/events/${id}/scanner`)}
                        >
                            <Ionicons name="scan-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text className="text-white font-bold text-[16px]">Escanear</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-1 bg-white border border-gray-200 py-3.5 rounded-2xl flex-row items-center justify-center"
                            onPress={() => router.push(`/events/${id}/registrations`)}
                        >
                            <Ionicons name="people-outline" size={20} color="#333" style={{ marginRight: 8 }} />
                            <Text className="text-gray-700 font-bold text-[16px]">Inscrições</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Action Bar - Join Event (not participant, not host) */}
            {!isHost && !isParticipant && !registrationClosed && (
                <View className="absolute bottom-0 left-0 right-0 bg-white px-4 py-4 border-t border-gray-100 pb-8">
                    <View className="flex-row items-center justify-between">
                        <View>
                            <Text className="text-[15px] text-gray-500 font-medium">Total</Text>
                            <View className="flex-row items-baseline">
                                <Text className="text-[24px] font-bold text-[#1A1A1A]">R$ {event.price}</Text>
                                <Text className="text-[14px] text-gray-500 ml-1">/ pessoa</Text>
                            </View>
                        </View>

                        <TouchableOpacity 
                            className={`px-8 py-3.5 rounded-2xl shadow-sm ${participantCount >= event.maxGuests ? 'bg-gray-400' : 'bg-[#FF8C42]'}`}
                            onPress={handleJoin}
                            disabled={participantCount >= event.maxGuests}
                        >
                            <Text className="text-white font-bold text-[16px]">
                                {participantCount >= event.maxGuests ? 'Esgotado' : 'Participar'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <ReportSheet
                visible={reportVisible}
                onClose={() => setReportVisible(false)}
                targetType="EVENT"
                targetId={id as string}
            />
        </View>
    );
}
