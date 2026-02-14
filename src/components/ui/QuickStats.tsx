import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/shared/constants/theme';

interface StatCardProps {
  value: number;
  label: string;
}

interface QuickStatsProps {
  eventsToday?: number;
  eventsThisWeek?: number;
  newHosts?: number;
}

export function QuickStats({ 
  eventsToday = 0, 
  eventsThisWeek = 0, 
  newHosts = 0 
}: QuickStatsProps) {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      accessibilityLabel="Estatísticas rápidas de eventos"
    >
      <StatCard value={eventsToday} label="EVENTOS HOJE" />
      <StatCard value={eventsThisWeek} label="ESSA SEMANA" />
      <StatCard value={newHosts} label="NOVOS HOSTS" />
    </ScrollView>
  );
}

function StatCard({ value, label }: StatCardProps) {
  return (
    <View 
      style={styles.card}
      accessible={true}
      accessibilityLabel={`${value} ${label.toLowerCase()}`}
    >
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.light.card,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.primary,
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
