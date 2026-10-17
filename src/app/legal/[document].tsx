import { LEGAL_DOCUMENTS, isLegalDocumentKey } from '@/shared/content/legal';
import { BrandSheet, BrandStackHeader } from '@/components/ui/wellcome';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

function toSentenceCase(value: string) {
    const lower = value.toLocaleLowerCase('pt-BR');
    return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1);
}

export default function LegalDocumentScreen() {
    const router = useRouter();
    const { document } = useLocalSearchParams<{ document?: string }>();
    const key = document && isLegalDocumentKey(document) ? document : 'terms';
    const content = LEGAL_DOCUMENTS[key];

    return (
        <View style={styles.screen}>
            <BrandStackHeader eyebrow="LEGAL" title={toSentenceCase(content.eyebrow)} onBack={() => router.back()} />

            <BrandSheet>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.introCard}>
                        <View style={styles.eyebrowPill}>
                            <Text style={styles.eyebrow}>{content.eyebrow}</Text>
                        </View>
                        <Text style={styles.title}>{content.title}</Text>
                        <Text style={styles.updated}>Versão vigente desde {content.updatedAt}</Text>
                        <Text style={styles.introduction}>{content.introduction}</Text>
                    </View>

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
            </BrandSheet>
        </View>
    );
}

const card = {
    backgroundColor: Palette.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Palette.lineSoft,
    padding: Spacing.xl,
} as const;

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Palette.paper },
    content: { padding: Spacing.xl, paddingBottom: 56, gap: Spacing.md },
    introCard: card,
    eyebrowPill: {
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.orangeSoft,
    },
    eyebrow: { color: Palette.orangeDarker, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
    title: { color: Palette.ink, fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.3, marginTop: Spacing.md },
    updated: { color: Palette.muted, fontSize: 12, marginTop: 10 },
    introduction: { color: Palette.inkSoft, fontSize: 15, lineHeight: 23, marginTop: Spacing.lg },
    section: card,
    sectionTitle: { color: Palette.ink, fontSize: 18, lineHeight: 24, fontWeight: '800', marginBottom: Spacing.sm },
    paragraph: { color: Palette.inkSoft, fontSize: 15, lineHeight: 23, marginBottom: Spacing.md },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: Spacing.sm },
    bullet: { width: 7, height: 7, borderRadius: 4, backgroundColor: Palette.orange, marginTop: 8 },
    bulletText: { flex: 1, color: Palette.inkSoft, fontSize: 15, lineHeight: 23 },
});
