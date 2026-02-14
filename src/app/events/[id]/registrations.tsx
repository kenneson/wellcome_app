import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/shared/lib/supabase';
import { DEFAULT_AVATAR_PLACEHOLDER } from '@/shared/lib/styles';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { registrationService } from '@/services/api/RegistrationService';
import { RegistrationStatus } from '@/entities/event/types';
import { getOptimizedImageUrl } from '@/utils/imageOptimizer';

export default function EventRegistrationsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<RegistrationStatus>(RegistrationStatus.PENDING);

    // Helper to open links
    const openLink = (url: string) => {
        if (!url) return;
        // Add protocol if missing
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
        Linking.canOpenURL(fullUrl).then(supported => {
            if (supported) Linking.openURL(fullUrl);
            else Alert.alert('Erro', 'Não foi possível abrir o link: ' + url);
        });
    };

    useEffect(() => {
        if (id) fetchRegistrations();
    }, [id]);

    async function fetchRegistrations() {
        try {
            setLoading(true);
            const data = await registrationService.getRegistrations(id as string);
            console.log('📋 Registrations fetched:', data);
            console.log('📋 Number of registrations:', data?.length);
            setRegistrations(data);
        } catch (error) {
            console.error('❌ Error fetching registrations:', error);
            Alert.alert('Erro', 'Não foi possível carregar as inscrições.');
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove(registrationId: string) {
        setProcessingId(registrationId);
        try {
            await registrationService.approveRegistration(registrationId);
            setRegistrations(prev => prev.map(r =>
                r.id === registrationId ? { ...r, status: RegistrationStatus.APPROVED } : r
            ));
            Alert.alert('Sucesso', 'Inscrição aprovada.');
        } catch (error) {
            Alert.alert('Erro', 'Falha ao aprovar inscrição.');
        } finally {
            setProcessingId(null);
        }
    }

    async function handleReject(registrationId: string) {
        setProcessingId(registrationId);
        try {
            await registrationService.rejectRegistration(registrationId);
            setRegistrations(prev => prev.map(r =>
                r.id === registrationId ? { ...r, status: RegistrationStatus.REJECTED } : r
            ));
            Alert.alert('Sucesso', 'Inscrição rejeitada.');
        } catch (error) {
            Alert.alert('Erro', 'Falha ao rejeitar inscrição.');
        } finally {
            setProcessingId(null);
        }
    }

    const filteredRegistrations = registrations.filter(r => r.status === activeTab);

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Image
                    source={{ uri: getOptimizedImageUrl(item.user?.avatarUrl, { width: 100 }) || DEFAULT_AVATAR_PLACEHOLDER }}
                    style={styles.avatar}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                />
                <View style={styles.userInfo}>
                    <View style={styles.headerTop}>
                        <View style={styles.nameContainer}>
                            <Text style={styles.userName}>{item.user?.fullName}</Text>
                            <Text style={styles.userOccupation}>{item.user?.occupation || 'Sem ocupação definida'}</Text>
                        </View>
                        <StatusBadge status={item.status} />
                    </View>

                    {item.user?.bio && (
                        <Text style={styles.userBio} numberOfLines={3}>{item.user.bio}</Text>
                    )}

                    <View style={styles.detailsContainer}>
                        {(item.user?.city || item.user?.neighborhood) && (
                            <View style={styles.detailRow}>
                                <Ionicons name="location-outline" size={14} color="#666" style={styles.detailIcon} />
                                <Text style={styles.detailText}>
                                    {[item.user.city, item.user.neighborhood].filter(Boolean).join(', ')}
                                </Text>
                            </View>
                        )}

                        {item.user?.lookingFor && (
                            <View style={styles.detailRow}>
                                <Ionicons name="search-outline" size={14} color="#666" style={styles.detailIcon} />
                                <Text style={styles.detailText}>Procurando: {item.user.lookingFor}</Text>
                            </View>
                        )}

                        {item.user?.languages && item.user.languages.length > 0 && (
                            <View style={styles.detailRow}>
                                <Ionicons name="chatbubble-outline" size={14} color="#666" style={styles.detailIcon} />
                                <Text style={styles.detailText}>{item.user.languages.join(', ')}</Text>
                            </View>
                        )}

                        {item.user?.website && (
                            <TouchableOpacity onPress={() => openLink(item.user.website)} style={styles.detailRow}>
                                <Ionicons name="link-outline" size={14} color="#007AFF" style={styles.detailIcon} />
                                <Text style={[styles.detailText, { color: '#007AFF' }]}>{item.user.website}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {item.answers && item.answers.length > 0 && (
                <View style={styles.answersContainer}>
                    <Text style={styles.answersTitle}>Respostas:</Text>
                    {item.answers.map((ans: any, idx: number) => (
                        <View key={idx} style={styles.answerItem}>
                            <Text style={styles.questionText}>{ans.question}</Text>
                            <Text style={styles.answerText}>{ans.answer}</Text>
                        </View>
                    ))}
                </View>
            )}

            {item.status === RegistrationStatus.PENDING && (
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleReject(item.id)}
                        disabled={processingId === item.id}
                    >
                        {processingId === item.id ? (
                            <ActivityIndicator color="#FF3B30" />
                        ) : (
                            <>
                                <Ionicons name="close" size={20} color="#FF3B30" />
                                <Text style={styles.rejectText}>Rejeitar</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleApprove(item.id)}
                        disabled={processingId === item.id}
                    >
                        {processingId === item.id ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="checkmark" size={20} color="#fff" />
                                <Text style={styles.approveText}>Aprovar</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Gestão de Inscrições</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === RegistrationStatus.PENDING && styles.activeTab]}
                    onPress={() => setActiveTab(RegistrationStatus.PENDING)}
                >
                    <Text style={[styles.tabText, activeTab === RegistrationStatus.PENDING && styles.activeTabText]}>Pendentes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === RegistrationStatus.APPROVED && styles.activeTab]}
                    onPress={() => setActiveTab(RegistrationStatus.APPROVED)}
                >
                    <Text style={[styles.tabText, activeTab === RegistrationStatus.APPROVED && styles.activeTabText]}>Confirmados</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === RegistrationStatus.REJECTED && styles.activeTab]}
                    onPress={() => setActiveTab(RegistrationStatus.REJECTED)}
                >
                    <Text style={[styles.tabText, activeTab === RegistrationStatus.REJECTED && styles.activeTabText]}>Rejeitados</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#FF8C42" />
                </View>
            ) : (
                <FlatList
                    data={filteredRegistrations}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>Nenhuma inscrição nesta categoria.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F9F9F9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    tabs: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#eee',
    },
    activeTab: {
        backgroundColor: '#FF8C42',
    },
    tabText: {
        color: '#666',
        fontWeight: '600',
    },
    activeTabText: {
        color: '#fff',
    },
    listContent: {
        padding: 16,
        gap: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    nameContainer: {
        flex: 1,
        marginRight: 8,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2,
    },
    userOccupation: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    userBio: {
        fontSize: 14,
        color: '#444',
        marginTop: 6,
        lineHeight: 20,
    },
    detailsContainer: {
        marginTop: 8,
        gap: 4,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailIcon: {
        marginRight: 6,
        width: 16,
    },
    detailText: {
        fontSize: 13,
        color: '#666',
        flex: 1,
    },
    answersContainer: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
    },
    answersTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 8,
    },
    answerItem: {
        marginBottom: 8,
    },
    questionText: {
        fontSize: 12,
        color: '#888',
        marginBottom: 2,
    },
    answerText: {
        fontSize: 14,
        color: '#333',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    approveButton: {
        backgroundColor: '#4CD964',
    },
    rejectButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#FF3B30',
    },
    approveText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    rejectText: {
        color: '#FF3B30',
        fontWeight: 'bold',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        padding: 24,
        alignItems: 'center',
    },
    emptyText: {
        color: '#999',
    },
});
