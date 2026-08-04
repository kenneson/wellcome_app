import {
    adminService,
    AdminIdentity,
    AdminOverview,
    KycRequest,
    ModerationReport,
    WithdrawalRequest,
} from '@/services/api/AdminService';
import { supabase } from '@/shared/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';

type AdminView = 'overview' | 'kyc' | 'withdrawals' | 'reports';

const viewLabels: Record<AdminView, string> = {
    overview: 'Visao geral',
    kyc: 'KYC',
    withdrawals: 'Saques',
    reports: 'Denuncias',
};

const viewIcons: Record<AdminView, keyof typeof Ionicons.glyphMap> = {
    overview: 'grid-outline',
    kyc: 'shield-checkmark-outline',
    withdrawals: 'cash-outline',
    reports: 'flag-outline',
};

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
}).format(value);

const formatDate = (value: string | null) => value
    ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : 'Sem registro';

const maskPixKey = (value: string) => value.length <= 6 ? value : `${value.slice(0, 3)}...${value.slice(-3)}`;

export default function AdminDashboardScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 960;
    const [activeView, setActiveView] = useState<AdminView>('overview');
    const [admin, setAdmin] = useState<AdminIdentity | null>(null);
    const [overview, setOverview] = useState<AdminOverview | null>(null);
    const [kycRequests, setKycRequests] = useState<KycRequest[]>([]);
    const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
    const [reports, setReports] = useState<ModerationReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);
    const [rejectTarget, setRejectTarget] = useState<KycRequest | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const loadData = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true);
        try {
            const [identity, summary, kyc, withdrawalList, reportList] = await Promise.all([
                adminService.getMe(),
                adminService.getOverview(),
                adminService.getKycRequests('PENDING'),
                adminService.getWithdrawals(),
                adminService.getReports('PENDING'),
            ]);
            setAdmin(identity);
            setOverview(summary);
            setKycRequests(kyc);
            setWithdrawals(withdrawalList);
            setReports(reportList);
        } catch {
            router.replace('/admin/login' as any);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [router]);

    useEffect(() => {
        loadData(true);
    }, [loadData]);

    const pendingWithdrawals = useMemo(
        () => withdrawals.filter((withdrawal) => withdrawal.status === 'PENDING'),
        [withdrawals]
    );

    const runAction = async (id: string, action: () => Promise<unknown>) => {
        setActionId(id);
        try {
            await action();
            await loadData();
        } catch (error: any) {
            Alert.alert('Nao foi possivel concluir', error.message || 'Tente novamente em instantes.');
        } finally {
            setActionId(null);
        }
    };

    const confirmKycApproval = (request: KycRequest) => {
        Alert.alert('Aprovar verificacao', `Confirmar a verificacao de ${request.fullName || 'este usuario'}?`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Aprovar', onPress: () => runAction(request.id, () => adminService.approveKyc(request.id)) },
        ]);
    };

    const submitKycRejection = async () => {
        if (!rejectTarget) return;
        if (rejectionReason.trim().length < 3) {
            Alert.alert('Motivo necessario', 'Descreva o motivo da rejeicao com pelo menos 3 caracteres.');
            return;
        }

        const target = rejectTarget;
        setRejectTarget(null);
        await runAction(target.id, () => adminService.rejectKyc(target.id, rejectionReason.trim()));
        setRejectionReason('');
    };

    const confirmWithdrawalApproval = (withdrawal: WithdrawalRequest) => {
        Alert.alert(
            'Autorizar saque',
            `Enviar ${formatCurrency(withdrawal.amount)} para ${withdrawal.userName || 'este anfitriao'}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Autorizar Pix', onPress: () => runAction(withdrawal.id, () => adminService.approveWithdrawal(withdrawal.id)) },
            ]
        );
    };

    const confirmReportResolution = (report: ModerationReport, status: 'RESOLVED' | 'DISMISSED') => {
        const label = status === 'RESOLVED' ? 'Resolver denuncia' : 'Dispensar denuncia';
        Alert.alert(label, `Confirmar esta decisao para a denuncia sobre ${report.targetLabel}?`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Confirmar', onPress: () => runAction(report.id, () => adminService.resolveReport(report.id, status)) },
        ]);
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        router.replace('/admin/login' as any);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingScreen}>
                <ActivityIndicator size="large" color="#FF8C42" />
            </SafeAreaView>
        );
    }

    const workspace = (
        <ScrollView
            style={isDesktop ? styles.desktopScroll : undefined}
            contentContainerStyle={[styles.content, isDesktop && styles.desktopContent]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={['#FF8C42']} />}
        >
            {activeView === 'overview' && <OverviewView overview={overview} onSelect={setActiveView} isDesktop={isDesktop} />}
            {activeView === 'kyc' && (
                <KycQueue
                    requests={kycRequests}
                    actionId={actionId}
                    onApprove={confirmKycApproval}
                    onReject={(request) => setRejectTarget(request)}
                />
            )}
            {activeView === 'withdrawals' && (
                <WithdrawalsQueue requests={pendingWithdrawals} actionId={actionId} onApprove={confirmWithdrawalApproval} />
            )}
            {activeView === 'reports' && (
                <ReportsQueue reports={reports} actionId={actionId} onResolve={confirmReportResolution} />
            )}
        </ScrollView>
    );

    return (
        <SafeAreaView style={styles.screen}>
            {isDesktop ? (
                <View style={styles.desktopShell}>
                    <View style={styles.desktopSidebar}>
                        <View style={styles.desktopBrand}>
                            <Text style={styles.desktopBrandKicker}>WELLCOME</Text>
                            <Text style={styles.desktopBrandTitle}>Central de operacoes</Text>
                            <Text style={styles.desktopBrandSubtitle}>Moderacao e financeiro</Text>
                        </View>

                        <AdminIdentityBar admin={admin} compact />
                        <AdminNavigation activeView={activeView} overview={overview} onSelect={setActiveView} desktop />

                        <View style={styles.desktopSidebarFooter}>
                            <TouchableOpacity style={styles.desktopLogoutButton} onPress={signOut} accessibilityLabel="Sair do painel administrativo">
                                <Ionicons name="log-out-outline" size={20} color="#9A3412" />
                                <Text style={styles.desktopLogoutText}>Sair da operacao</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.desktopMain}>
                        <View style={styles.desktopTopbar}>
                            <View>
                                <Text style={styles.desktopTopbarTitle}>{viewLabels[activeView]}</Text>
                                <Text style={styles.desktopTopbarSubtitle}>Acompanhe e resolva as filas da plataforma.</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.refreshButton}
                                onPress={() => { setRefreshing(true); loadData(); }}
                                accessibilityLabel="Atualizar dados do painel"
                            >
                                {refreshing ? <ActivityIndicator size="small" color="#B45309" /> : <Ionicons name="refresh-outline" size={21} color="#B45309" />}
                            </TouchableOpacity>
                        </View>
                        {workspace}
                    </View>
                </View>
            ) : (
                <>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerKicker}>WELLCOME</Text>
                            <Text style={styles.headerTitle}>Central de operacoes</Text>
                        </View>
                        <TouchableOpacity style={styles.logoutButton} onPress={signOut} accessibilityLabel="Sair do painel administrativo">
                            <Ionicons name="log-out-outline" size={21} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                    <AdminIdentityBar admin={admin} />
                    <AdminNavigation activeView={activeView} overview={overview} onSelect={setActiveView} />
                    {workspace}
                </>
            )}

            <Modal visible={Boolean(rejectTarget)} transparent animationType="fade" onRequestClose={() => setRejectTarget(null)}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Rejeitar verificacao</Text>
                        <Text style={styles.modalSubtitle}>Explique para {rejectTarget?.fullName || 'o usuario'} o que precisa ser corrigido.</Text>
                        <TextInput
                            style={styles.reasonInput}
                            value={rejectionReason}
                            onChangeText={setRejectionReason}
                            multiline
                            autoFocus
                            placeholder="Ex.: O documento esta ilegivel. Envie uma nova foto com boa iluminacao."
                            placeholderTextColor="#8A8A8A"
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.secondaryAction} onPress={() => { setRejectTarget(null); setRejectionReason(''); }}>
                                <Text style={styles.secondaryActionText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.dangerAction} onPress={submitKycRejection}>
                                <Text style={styles.primaryActionText}>Rejeitar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function AdminIdentityBar({ admin, compact = false }: { admin: AdminIdentity | null; compact?: boolean }) {
    return (
        <View style={[styles.identityBar, compact && styles.desktopIdentityBar]}>
            <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>{admin?.fullName?.slice(0, 1).toUpperCase() || 'A'}</Text>
            </View>
            <View style={styles.identityText}>
                <Text style={styles.adminName} numberOfLines={1}>{admin?.fullName || 'Administrador'}</Text>
                <Text style={styles.adminEmail} numberOfLines={1}>{admin?.email || 'Conta administrativa'}</Text>
            </View>
            <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>ADMIN</Text></View>
        </View>
    );
}

function AdminNavigation({ activeView, overview, onSelect, desktop = false }: {
    activeView: AdminView;
    overview: AdminOverview | null;
    onSelect: (view: AdminView) => void;
    desktop?: boolean;
}) {
    const items = (Object.keys(viewLabels) as AdminView[]).map((view) => {
        const count = view === 'kyc' ? overview?.pendingKyc : view === 'withdrawals' ? overview?.pendingWithdrawals : view === 'reports' ? overview?.pendingReports : undefined;
        const selected = activeView === view;

        return (
            <TouchableOpacity
                key={view}
                style={[styles.tab, desktop && styles.desktopTab, selected && styles.tabActive, selected && desktop && styles.desktopTabActive]}
                onPress={() => onSelect(view)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
            >
                {desktop && <Ionicons name={viewIcons[view]} size={19} color={selected ? '#B45309' : '#7C6C63'} />}
                <Text style={[styles.tabText, desktop && styles.desktopTabText, selected && styles.tabTextActive, selected && desktop && styles.desktopTabTextActive]}>{viewLabels[view]}</Text>
                {view !== 'overview' && count !== undefined && (
                    <View style={[styles.tabCount, selected && styles.tabCountActive, selected && desktop && styles.desktopTabCountActive]}>
                        <Text style={[styles.tabCountText, selected && styles.tabCountTextActive, selected && desktop && styles.desktopTabCountTextActive]}>{count}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    });

    if (desktop) return <View style={styles.desktopNavigation}>{items}</View>;

    return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>{items}</ScrollView>;
}

function OverviewView({ overview, onSelect, isDesktop }: { overview: AdminOverview | null; onSelect: (view: AdminView) => void; isDesktop: boolean }) {
    const cards = [
        { label: 'KYC pendente', value: overview?.pendingKyc || 0, icon: 'shield-checkmark-outline' as const, color: '#B45309', view: 'kyc' as const },
        { label: 'Saques pendentes', value: overview?.pendingWithdrawals || 0, icon: 'cash-outline' as const, color: '#0F766E', view: 'withdrawals' as const },
        { label: 'Denuncias abertas', value: overview?.pendingReports || 0, icon: 'flag-outline' as const, color: '#B91C1C', view: 'reports' as const },
    ];

    return (
        <>
            <Text style={styles.sectionTitle}>Fila de trabalho</Text>
            <View style={styles.statsGrid}>
                {cards.map((card) => (
                    <TouchableOpacity key={card.view} style={[styles.statCard, { borderLeftColor: card.color }]} onPress={() => onSelect(card.view)}>
                        <View style={styles.statIcon}><Ionicons name={card.icon} size={20} color={card.color} /></View>
                        <Text style={styles.statValue}>{card.value}</Text>
                        <Text style={styles.statLabel}>{card.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.operationalStrip}>
                <View>
                    <Text style={styles.operationalLabel}>Usuarios cadastrados</Text>
                    <Text style={styles.operationalValue}>{overview?.totalUsers || 0}</Text>
                </View>
                <View style={styles.stripDivider} />
                <View>
                    <Text style={styles.operationalLabel}>Pix em processamento</Text>
                    <Text style={styles.operationalValue}>{overview?.processingWithdrawals || 0}</Text>
                </View>
            </View>

            <Text style={styles.sectionTitle}>Atalhos</Text>
            <View style={isDesktop ? styles.shortcutGrid : undefined}>
                <ActionRow desktop={isDesktop} icon="shield-checkmark-outline" title="Revisar verificacoes" description="Documentos e selfies aguardando decisao." onPress={() => onSelect('kyc')} />
                <ActionRow desktop={isDesktop} icon="cash-outline" title="Autorizar saques" description="Solicitacoes de anfitrioes com saldo reservado." onPress={() => onSelect('withdrawals')} />
                <ActionRow desktop={isDesktop} icon="flag-outline" title="Tratar denuncias" description="Conteudos e perfis sinalizados pela comunidade." onPress={() => onSelect('reports')} />
            </View>
        </>
    );
}

function KycQueue({ requests, actionId, onApprove, onReject }: {
    requests: KycRequest[];
    actionId: string | null;
    onApprove: (request: KycRequest) => void;
    onReject: (request: KycRequest) => void;
}) {
    return <QueueState empty={requests.length === 0} icon="shield-checkmark-outline" title="Nenhuma verificacao pendente" subtitle="Novas solicitacoes aparecerao aqui.">
        {requests.map((request) => (
            <View key={request.id} style={styles.queueCard}>
                <View style={styles.cardHeader}>
                    <View style={styles.personMark}><Text style={styles.personMarkText}>{request.fullName?.slice(0, 1).toUpperCase() || '?'}</Text></View>
                    <View style={styles.cardHeaderText}>
                        <Text style={styles.cardTitle}>{request.fullName || 'Usuario sem nome'}</Text>
                        <Text style={styles.cardSubtext}>{request.email || request.city || 'Sem dados de contato'}</Text>
                    </View>
                    <StatusPill label="PENDENTE" tone="warning" />
                </View>
                <View style={styles.detailGrid}>
                    <Detail label="Enviado" value={formatDate(request.kycSubmittedAt)} />
                    <Detail label="Similaridade" value={request.kycSimilarityScore === null ? 'Sem score' : `${Math.round(request.kycSimilarityScore)}%`} />
                </View>
                <View style={styles.documentLinks}>
                    <DocumentLink label="Documento" url={request.kycDocumentSignedUrl} />
                    <DocumentLink label="Selfie" url={request.kycSelfieSignedUrl} />
                </View>
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.rejectButton} onPress={() => onReject(request)} disabled={actionId === request.id}>
                        <Text style={styles.rejectButtonText}>Rejeitar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.approveButton} onPress={() => onApprove(request)} disabled={actionId === request.id}>
                        {actionId === request.id ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.approveButtonText}>Aprovar</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        ))}
    </QueueState>;
}

function WithdrawalsQueue({ requests, actionId, onApprove }: {
    requests: WithdrawalRequest[];
    actionId: string | null;
    onApprove: (request: WithdrawalRequest) => void;
}) {
    return <QueueState empty={requests.length === 0} icon="cash-outline" title="Nenhum saque pendente" subtitle="As novas solicitacoes de saque aparecerao aqui.">
        {requests.map((request) => (
            <View key={request.id} style={styles.queueCard}>
                <View style={styles.cardHeader}>
                    <View style={styles.moneyMark}><Ionicons name="cash-outline" size={20} color="#0F766E" /></View>
                    <View style={styles.cardHeaderText}>
                        <Text style={styles.cardTitle}>{request.userName || 'Anfitriao'}</Text>
                        <Text style={styles.cardSubtext}>{formatDate(request.createdAt)}</Text>
                    </View>
                    <Text style={styles.amount}>{formatCurrency(request.amount)}</Text>
                </View>
                <View style={styles.detailGrid}>
                    <Detail label="Chave Pix" value={maskPixKey(request.pixKey)} />
                    <Detail label="Tipo" value={request.pixKeyType || 'Nao informado'} />
                </View>
                <TouchableOpacity style={styles.approveButtonFull} onPress={() => onApprove(request)} disabled={actionId === request.id}>
                    {actionId === request.id ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.approveButtonText}>Autorizar envio Pix</Text>}
                </TouchableOpacity>
            </View>
        ))}
    </QueueState>;
}

function ReportsQueue({ reports, actionId, onResolve }: {
    reports: ModerationReport[];
    actionId: string | null;
    onResolve: (report: ModerationReport, status: 'RESOLVED' | 'DISMISSED') => void;
}) {
    return <QueueState empty={reports.length === 0} icon="flag-outline" title="Nenhuma denuncia pendente" subtitle="A comunidade nao possui itens aguardando moderacao.">
        {reports.map((report) => (
            <View key={report.id} style={styles.queueCard}>
                <View style={styles.cardHeader}>
                    <View style={styles.reportMark}><Ionicons name="flag-outline" size={20} color="#B91C1C" /></View>
                    <View style={styles.cardHeaderText}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{report.targetLabel}</Text>
                        <Text style={styles.cardSubtext}>{report.targetType} · {formatDate(report.createdAt)}</Text>
                    </View>
                    <StatusPill label={report.reason.replace(/_/g, ' ')} tone="danger" />
                </View>
                {report.targetDetail ? <Text style={styles.contextText}>{report.targetDetail}</Text> : null}
                {report.details ? <Text style={styles.reportDetails}>{report.details}</Text> : <Text style={styles.emptyDetails}>Nenhum detalhe adicional foi enviado.</Text>}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.rejectButton} onPress={() => onResolve(report, 'DISMISSED')} disabled={actionId === report.id}>
                        <Text style={styles.rejectButtonText}>Dispensar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.approveButton} onPress={() => onResolve(report, 'RESOLVED')} disabled={actionId === report.id}>
                        {actionId === report.id ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.approveButtonText}>Resolver</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        ))}
    </QueueState>;
}

function QueueState({ empty, icon, title, subtitle, children }: { empty: boolean; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; children: ReactNode }) {
    if (!empty) return <>{children}</>;
    return <View style={styles.emptyQueue}>
        <Ionicons name={icon} size={32} color="#FF8C42" />
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>;
}

function Detail({ label, value }: { label: string; value: string }) {
    return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue} numberOfLines={1}>{value}</Text></View>;
}

function DocumentLink({ label, url }: { label: string; url: string | null }) {
    return <TouchableOpacity style={[styles.documentLink, !url && styles.documentLinkDisabled]} disabled={!url} onPress={() => url && Linking.openURL(url)}>
        <Ionicons name="document-text-outline" size={17} color={url ? '#B45309' : '#8A8A8A'} />
        <Text style={[styles.documentLinkText, !url && styles.documentLinkTextDisabled]}>{label}</Text>
    </TouchableOpacity>;
}

function StatusPill({ label, tone }: { label: string; tone: 'warning' | 'danger' }) {
    return <View style={[styles.statusPill, tone === 'warning' ? styles.statusWarning : styles.statusDanger]}><Text style={[styles.statusText, tone === 'warning' ? styles.statusWarningText : styles.statusDangerText]} numberOfLines={1}>{label}</Text></View>;
}

function ActionRow({ icon, title, description, onPress, desktop = false }: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string; onPress: () => void; desktop?: boolean }) {
    return <TouchableOpacity style={[styles.shortcutRow, desktop && styles.shortcutCard]} onPress={onPress}>
        <View style={styles.shortcutIcon}><Ionicons name={icon} size={21} color="#FF8C42" /></View>
        <View style={styles.shortcutContent}><Text style={styles.shortcutTitle}>{title}</Text><Text style={styles.shortcutDescription}>{description}</Text></View>
        <Ionicons name="chevron-forward" size={20} color="#A2A2A2" />
    </TouchableOpacity>;
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F8F6F2' },
    loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F6F2' },
    desktopShell: { flex: 1, flexDirection: 'row', backgroundColor: '#F8F6F2' },
    desktopSidebar: { width: 276, backgroundColor: '#FFFCF9', borderRightWidth: 1, borderRightColor: '#E9E0D9' },
    desktopBrand: { minHeight: 136, backgroundColor: '#F57635', paddingHorizontal: 24, paddingVertical: 24, justifyContent: 'flex-end' },
    desktopBrandKicker: { color: '#FFE3CF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
    desktopBrandTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '700', marginTop: 5 },
    desktopBrandSubtitle: { color: '#FFE3CF', fontSize: 12, marginTop: 5 },
    desktopIdentityBar: { minHeight: 88, paddingHorizontal: 18, borderBottomColor: '#F0E5DE', backgroundColor: '#FFF8F2' },
    desktopNavigation: { flex: 1, padding: 12, gap: 6 },
    desktopTab: { minHeight: 46, height: 'auto', borderRadius: 7, paddingHorizontal: 13, borderWidth: 0, justifyContent: 'flex-start', gap: 10 },
    desktopTabActive: { backgroundColor: '#FFF0E4' },
    desktopTabText: { fontSize: 14 },
    desktopTabTextActive: { color: '#9A3412' },
    desktopSidebarFooter: { padding: 12, borderTopWidth: 1, borderTopColor: '#F0E5DE' },
    desktopLogoutButton: { minHeight: 44, borderRadius: 7, backgroundColor: '#FFF3EA', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    desktopLogoutText: { color: '#9A3412', fontSize: 13, fontWeight: '700' },
    desktopMain: { flex: 1, minWidth: 0 },
    desktopTopbar: { minHeight: 96, paddingHorizontal: 32, backgroundColor: '#FFFCF9', borderBottomWidth: 1, borderBottomColor: '#E9E0D9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    desktopTopbarTitle: { color: '#29231F', fontSize: 24, fontWeight: '700' },
    desktopTopbarSubtitle: { color: '#746961', fontSize: 13, marginTop: 5 },
    refreshButton: { width: 44, height: 44, borderRadius: 7, backgroundColor: '#FFF0E4', alignItems: 'center', justifyContent: 'center' },
    desktopScroll: { flex: 1 },
    header: { backgroundColor: '#F57635', minHeight: 86, paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerKicker: { color: '#FFE3CF', fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
    headerTitle: { color: '#FFFFFF', fontSize: 23, fontWeight: '700', marginTop: 3 },
    logoutButton: { width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
    identityBar: { minHeight: 70, backgroundColor: '#FFFCF9', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E9E0D9' },
    avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF0E4', alignItems: 'center', justifyContent: 'center' },
    avatarLetter: { color: '#B45309', fontWeight: '700', fontSize: 15 },
    identityText: { flex: 1, marginLeft: 10 },
    adminName: { color: '#2B2B2B', fontSize: 14, fontWeight: '700' },
    adminEmail: { color: '#777777', fontSize: 12, marginTop: 2 },
    roleBadge: { backgroundColor: '#E7F7F3', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
    roleBadgeText: { color: '#0F766E', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    tabs: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: '#FFFCF9', borderBottomWidth: 1, borderBottomColor: '#E9E0D9' },
    tab: { height: 36, borderRadius: 18, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E8DDD6', backgroundColor: '#FFFCF9' },
    tabActive: { borderColor: '#F57635', backgroundColor: '#F57635' },
    tabText: { color: '#5F5F5F', fontSize: 13, fontWeight: '600' },
    tabTextActive: { color: '#FFFFFF' },
    tabCount: { minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: '#F5ECE7', alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
    tabCountActive: { backgroundColor: 'rgba(255,255,255,0.24)' },
    desktopTabCountActive: { backgroundColor: '#FCD8C4' },
    tabCountText: { color: '#845D48', fontSize: 10, fontWeight: '800' },
    tabCountTextActive: { color: '#FFFFFF' },
    desktopTabCountTextActive: { color: '#9A3412' },
    content: { padding: 16, paddingBottom: 44 },
    desktopContent: { width: '100%', maxWidth: 1520, alignSelf: 'center', paddingHorizontal: 32, paddingTop: 28, paddingBottom: 56 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#342D28', marginBottom: 12, marginTop: 4 },
    statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    statCard: { flex: 1, minHeight: 128, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAE1DB', borderLeftWidth: 4, padding: 15, justifyContent: 'space-between' },
    statIcon: { width: 32, height: 32, borderRadius: 7, backgroundColor: '#FFF8F2', alignItems: 'center', justifyContent: 'center' },
    statValue: { fontSize: 30, color: '#2C2C2C', fontWeight: '700', marginTop: 10 },
    statLabel: { color: '#6D625C', fontSize: 11, lineHeight: 15, fontWeight: '600' },
    operationalStrip: { borderRadius: 8, backgroundColor: '#EDF6F3', borderWidth: 1, borderColor: '#D7E9E2', padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 26 },
    operationalLabel: { color: '#507068', fontSize: 11, marginBottom: 6 },
    operationalValue: { color: '#165F52', fontSize: 20, fontWeight: '700' },
    stripDivider: { width: 1, alignSelf: 'stretch', backgroundColor: '#D6E8E1', marginHorizontal: 22 },
    shortcutRow: { minHeight: 76, borderBottomWidth: 1, borderBottomColor: '#EDE3DD', flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    shortcutGrid: { flexDirection: 'row', gap: 12 },
    shortcutCard: { flex: 1, minHeight: 104, borderWidth: 1, borderColor: '#EAE1DB', borderRadius: 8, backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 14 },
    shortcutIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#FFF0E4', alignItems: 'center', justifyContent: 'center' },
    shortcutContent: { flex: 1, marginHorizontal: 12 },
    shortcutTitle: { color: '#333333', fontSize: 14, fontWeight: '700' },
    shortcutDescription: { color: '#727272', fontSize: 12, marginTop: 3, lineHeight: 17 },
    queueCard: { backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#EAE1DB', padding: 16, marginBottom: 12 },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    cardHeaderText: { flex: 1, marginLeft: 10 },
    personMark: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFF0E4', alignItems: 'center', justifyContent: 'center' },
    personMarkText: { color: '#B45309', fontSize: 15, fontWeight: '800' },
    moneyMark: { width: 38, height: 38, borderRadius: 8, backgroundColor: '#E7F7F3', alignItems: 'center', justifyContent: 'center' },
    reportMark: { width: 38, height: 38, borderRadius: 8, backgroundColor: '#FDECEC', alignItems: 'center', justifyContent: 'center' },
    cardTitle: { color: '#303030', fontSize: 14, fontWeight: '700' },
    cardSubtext: { color: '#777777', fontSize: 12, marginTop: 3 },
    amount: { color: '#0F766E', fontWeight: '800', fontSize: 15 },
    statusPill: { maxWidth: 110, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 4 },
    statusWarning: { backgroundColor: '#FFF4D9' },
    statusDanger: { backgroundColor: '#FDECEC' },
    statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.2 },
    statusWarningText: { color: '#9A6700' },
    statusDangerText: { color: '#B42318' },
    detailGrid: { flexDirection: 'row', marginTop: 14, backgroundColor: '#FCF8F5', borderRadius: 6, padding: 10, gap: 12 },
    detail: { flex: 1 },
    detailLabel: { color: '#8A756B', fontSize: 10, marginBottom: 4 },
    detailValue: { color: '#4A403B', fontSize: 12, fontWeight: '600' },
    documentLinks: { flexDirection: 'row', gap: 8, marginTop: 12 },
    documentLink: { height: 34, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#FFF6E9', flexDirection: 'row', alignItems: 'center', gap: 5 },
    documentLinkDisabled: { backgroundColor: '#F3F3F3' },
    documentLinkText: { color: '#B45309', fontSize: 12, fontWeight: '700' },
    documentLinkTextDisabled: { color: '#8A8A8A' },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
    rejectButton: { flex: 1, minHeight: 42, borderRadius: 6, borderWidth: 1, borderColor: '#E8C5C5', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF9F9' },
    rejectButtonText: { color: '#B42318', fontSize: 13, fontWeight: '700' },
    approveButton: { flex: 1, minHeight: 42, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF8C42' },
    approveButtonFull: { minHeight: 42, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF8C42', marginTop: 14 },
    approveButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
    contextText: { color: '#6D625C', fontSize: 12, marginTop: 13 },
    reportDetails: { color: '#3D3D3D', fontSize: 13, lineHeight: 19, marginTop: 8 },
    emptyDetails: { color: '#8A8A8A', fontSize: 12, fontStyle: 'italic', marginTop: 8 },
    emptyQueue: { alignItems: 'center', paddingHorizontal: 34, paddingVertical: 72 },
    emptyTitle: { color: '#353535', fontSize: 16, fontWeight: '700', marginTop: 14, textAlign: 'center' },
    emptySubtitle: { color: '#777777', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(35, 26, 22, 0.48)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 20 },
    modalTitle: { color: '#2C2C2C', fontSize: 19, fontWeight: '700' },
    modalSubtitle: { color: '#6B6B6B', fontSize: 13, lineHeight: 19, marginTop: 7 },
    reasonInput: { minHeight: 112, borderWidth: 1, borderColor: '#E4D9D2', borderRadius: 8, padding: 12, color: '#303030', fontSize: 14, textAlignVertical: 'top', marginTop: 16 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
    secondaryAction: { height: 42, paddingHorizontal: 15, justifyContent: 'center', alignItems: 'center' },
    secondaryActionText: { color: '#696969', fontSize: 14, fontWeight: '700' },
    dangerAction: { height: 42, paddingHorizontal: 18, borderRadius: 6, justifyContent: 'center', alignItems: 'center', backgroundColor: '#B42318' },
    primaryActionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
