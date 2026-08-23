import { LEGAL_DOCUMENTS, isLegalDocumentKey } from '@/shared/content/legal';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LegalDocumentScreen() {
    const router = useRouter();
    const { document } = useLocalSearchParams<{ document?: string }>();
    const key = document && isLegalDocumentKey(document) ? document : 'terms';
    const content = LEGAL_DOCUMENTS[key];

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Voltar"
                >
                    <Ionicons name="chevron-back" size={27} color="#202124" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{content.eyebrow}</Text>
                <View style={styles.headerButton} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.eyebrow}>{content.eyebrow}</Text>
                <Text style={styles.title}>{content.title}</Text>
                <Text style={styles.updated}>Versão vigente desde {content.updatedAt}</Text>
                <Text style={styles.introduction}>{content.introduction}</Text>

                {content.sections.map((section) => (
                    <View key={section.title} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        {section.paragraphs.map((paragraph) => (
                            <Text key={paragraph} style={styles.paragraph}>{paragraph}</Text>
                        ))}
                        {section.bullets?.map((bullet) => (
                            <View key={bullet} style={styles.bulletRow}>
                                <View style={styles.bullet} />
                                <Text style={styles.bulletText}>{bullet}</Text>
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFCF8' },
    header: {
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5DED6',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
    },
    headerButton: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '800', color: '#5B5048' },
    content: { paddingHorizontal: 22, paddingTop: 28, paddingBottom: 56 },
    eyebrow: { color: '#C45D22', fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
    title: { color: '#202124', fontSize: 30, lineHeight: 36, fontWeight: '900', marginTop: 8 },
    updated: { color: '#77716C', fontSize: 12, marginTop: 10 },
    introduction: { color: '#4B4A48', fontSize: 16, lineHeight: 25, marginTop: 18 },
    section: { marginTop: 30 },
    sectionTitle: { color: '#202124', fontSize: 20, lineHeight: 25, fontWeight: '800', marginBottom: 8 },
    paragraph: { color: '#4F4D4A', fontSize: 15, lineHeight: 24, marginBottom: 12 },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8 },
    bullet: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E56F2D', marginTop: 8 },
    bulletText: { flex: 1, color: '#4F4D4A', fontSize: 15, lineHeight: 23 },
});
