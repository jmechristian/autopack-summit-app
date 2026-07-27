import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  ADMIN_SEATING_CHART_ID,
  AdminRegistrantListItem,
  listAdminRegistrants,
} from '../../../src/components/admin/registrants/adminRegistrantsService';
import {
  assignRegistrantToTable,
  listAdminSeatingAssignments,
  removeSeatingAssignment,
  SeatingAssignment,
} from '../../../src/components/admin/seating/adminSeatingService';
import { AppButton } from '../../../src/ui/AppButton';
import { AppCard } from '../../../src/ui/AppCard';
import { AppScreen } from '../../../src/ui/AppScreen';
import { ui } from '../../../src/ui/tokens';

function parseTableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

export default function AdminSeatingChartScreen() {
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registrants, setRegistrants] = useState<AdminRegistrantListItem[]>([]);
  const [assignments, setAssignments] = useState<SeatingAssignment[]>([]);
  const [search, setSearch] = useState('');
  const [targetTableDraft, setTargetTableDraft] = useState('');
  const [newTableDraft, setNewTableDraft] = useState('');
  const [manualTables, setManualTables] = useState<number[]>([]);
  const [moveDraftByAssignment, setMoveDraftByAssignment] = useState<Record<string, string>>(
    {},
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [registrantRows, seatingRows] = await Promise.all([
        listAdminRegistrants(),
        listAdminSeatingAssignments(ADMIN_SEATING_CHART_ID),
      ]);
      setRegistrants(registrantRows);
      setAssignments(seatingRows);
    } catch (e: any) {
      setError(e?.message || 'Unable to load seating chart data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const assignmentsByRegistrant = useMemo(() => {
    const map = new Map<string, SeatingAssignment>();
    for (const assignment of assignments) {
      map.set(assignment.registrantID, assignment);
    }
    return map;
  }, [assignments]);

  const registrantById = useMemo(() => {
    const map = new Map<string, AdminRegistrantListItem>();
    for (const registrant of registrants) {
      map.set(registrant.id, registrant);
    }
    return map;
  }, [registrants]);

  const tableNumbers = useMemo(() => {
    const fromAssignments = assignments
      .map((row) => row.tableNumber)
      .filter((table): table is number => table === 0 || !!table);
    return Array.from(new Set([...fromAssignments, ...manualTables])).sort((a, b) => a - b);
  }, [assignments, manualTables]);

  const groupedAssignments = useMemo(() => {
    const map = new Map<number, SeatingAssignment[]>();
    for (const assignment of assignments) {
      if (!(assignment.tableNumber === 0 || assignment.tableNumber)) continue;
      const key = Number(assignment.tableNumber);
      const rows = map.get(key) || [];
      rows.push(assignment);
      map.set(key, rows);
    }
    for (const table of tableNumbers) {
      if (!map.has(table)) map.set(table, []);
    }
    for (const [table, rows] of map.entries()) {
      rows.sort((a, b) => {
        const aName = `${a.lastName || ''} ${a.firstName || ''}`.trim().toLowerCase();
        const bName = `${b.lastName || ''} ${b.firstName || ''}`.trim().toLowerCase();
        return aName.localeCompare(bName);
      });
      map.set(table, rows);
    }
    return map;
  }, [assignments, tableNumbers]);

  const filteredRegistrants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [] as AdminRegistrantListItem[];
    return registrants
      .filter((item) => {
        const name = `${item.firstName || ''} ${item.lastName || ''}`.toLowerCase();
        const email = String(item.email || '').toLowerCase();
        const company = String(item.companyName || '').toLowerCase();
        return name.includes(q) || email.includes(q) || company.includes(q);
      })
      .slice(0, 40);
  }, [registrants, search]);

  const createTable = () => {
    const parsed = parseTableNumber(newTableDraft);
    if (parsed == null) {
      Alert.alert('Invalid table', 'Enter a valid non-negative table number.');
      return;
    }
    setManualTables((prev) => Array.from(new Set([...prev, parsed])).sort((a, b) => a - b));
    if (!targetTableDraft.trim()) setTargetTableDraft(String(parsed));
    setNewTableDraft('');
  };

  const addOrMoveRegistrant = async (registrant: AdminRegistrantListItem) => {
    const tableNumber = parseTableNumber(targetTableDraft);
    if (tableNumber == null) {
      Alert.alert('Table required', 'Enter the target table number first.');
      return;
    }
    const existing = assignmentsByRegistrant.get(registrant.id) || null;
    try {
      setSavingKey(`assign-${registrant.id}`);
      await assignRegistrantToTable({
        registrant,
        tableNumber,
        existingAssignment: existing,
        seatingChartID: ADMIN_SEATING_CHART_ID,
      });
      await load();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Unable to assign registrant to table.');
    } finally {
      setSavingKey(null);
    }
  };

  const moveFromTable = async (assignment: SeatingAssignment) => {
    const draft = moveDraftByAssignment[assignment.id] || '';
    const tableNumber = parseTableNumber(draft);
    if (tableNumber == null) {
      Alert.alert('Invalid table', 'Enter a valid target table number.');
      return;
    }
    const registrant = registrantById.get(assignment.registrantID);
    if (!registrant) {
      Alert.alert('Registrant missing', 'Unable to find this registrant in the current list.');
      return;
    }
    try {
      setSavingKey(`move-${assignment.id}`);
      await assignRegistrantToTable({
        registrant,
        tableNumber,
        existingAssignment: assignment,
        seatingChartID: ADMIN_SEATING_CHART_ID,
      });
      setMoveDraftByAssignment((prev) => ({ ...prev, [assignment.id]: '' }));
      await load();
    } catch (e: any) {
      Alert.alert('Move failed', e?.message || 'Unable to move registrant.');
    } finally {
      setSavingKey(null);
    }
  };

  const removeFromTable = async (assignment: SeatingAssignment) => {
    try {
      setSavingKey(`remove-${assignment.id}`);
      await removeSeatingAssignment(assignment.id);
      await load();
    } catch (e: any) {
      Alert.alert('Remove failed', e?.message || 'Unable to remove registrant from table.');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Seating Chart</Text>
          <Text style={styles.meta}>Chart ID: {ADMIN_SEATING_CHART_ID}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Create New Table</Text>
          <View style={styles.row}>
            <TextInput
              value={newTableDraft}
              onChangeText={setNewTableDraft}
              keyboardType='number-pad'
              placeholder='Table #'
              placeholderTextColor={ui.colors.muted}
              style={[styles.input, styles.rowInput]}
            />
            <AppButton title='Create Table' onPress={createTable} style={styles.button} />
          </View>
          <Text style={styles.meta}>Creates a table slot for assignment in this session.</Text>
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Search + Add Registrants</Text>
          <TextInput
            value={targetTableDraft}
            onChangeText={setTargetTableDraft}
            keyboardType='number-pad'
            placeholder='Target table number'
            placeholderTextColor={ui.colors.muted}
            style={styles.input}
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder='Search registrants by name/email/company'
            placeholderTextColor={ui.colors.muted}
            style={[styles.input, { marginTop: 10 }]}
            autoCapitalize='none'
          />
          {search.trim() ? (
            <View style={styles.resultsWrap}>
              {filteredRegistrants.map((registrant) => {
                const existing = assignmentsByRegistrant.get(registrant.id) || null;
                const fullName =
                  `${registrant.firstName || ''} ${registrant.lastName || ''}`.trim() ||
                  'Unnamed';
                return (
                  <View key={registrant.id} style={styles.resultRow}>
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultTitle}>{fullName}</Text>
                      <Text style={styles.resultMeta}>
                        {registrant.email || 'No email'} • {registrant.companyName || 'No company'}
                      </Text>
                      <Text style={styles.resultMeta}>
                        Current table:{' '}
                        {existing?.tableNumber === 0 || existing?.tableNumber
                          ? String(existing.tableNumber)
                          : 'Unassigned'}
                      </Text>
                    </View>
                    <AppButton
                      title={
                        savingKey === `assign-${registrant.id}`
                          ? 'Saving...'
                          : existing
                            ? 'Move'
                            : 'Add'
                      }
                      onPress={() => addOrMoveRegistrant(registrant)}
                      disabled={savingKey === `assign-${registrant.id}`}
                      style={styles.button}
                    />
                  </View>
                );
              })}
              {!filteredRegistrants.length ? (
                <Text style={[styles.meta, { paddingVertical: 8 }]}>No matching registrants.</Text>
              ) : null}
            </View>
          ) : null}
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Current Tables + Registrants</Text>
          {loading ? <Text style={styles.meta}>Loading seating chart...</Text> : null}
          {!loading && !tableNumbers.length ? (
            <Text style={styles.meta}>No tables yet. Create one above or add a registrant to a table.</Text>
          ) : null}
          {!loading &&
            tableNumbers.map((tableNumber) => {
              const rows = groupedAssignments.get(tableNumber) || [];
              return (
                <View key={`table-${tableNumber}`} style={styles.tableBlock}>
                  <Text style={styles.tableTitle}>Table {tableNumber}</Text>
                  {!rows.length ? <Text style={styles.meta}>No registrants assigned.</Text> : null}
                  {rows.map((assignment) => {
                    const fullName =
                      `${assignment.firstName || ''} ${assignment.lastName || ''}`.trim() ||
                      'Unnamed';
                    return (
                      <View key={assignment.id} style={styles.assignmentRow}>
                        <View style={styles.assignmentMain}>
                          <Text style={styles.resultTitle}>{fullName}</Text>
                          <Text style={styles.resultMeta}>
                            {assignment.email || 'No email'} • {assignment.company || 'No company'}
                          </Text>
                        </View>
                        <View style={styles.assignmentActions}>
                          <AppButton
                            title={savingKey === `remove-${assignment.id}` ? 'Removing...' : 'Remove'}
                            variant='outline'
                            onPress={() => removeFromTable(assignment)}
                            disabled={savingKey === `remove-${assignment.id}`}
                            style={styles.button}
                          />
                          <View style={styles.moveRow}>
                            <TextInput
                              value={moveDraftByAssignment[assignment.id] || ''}
                              onChangeText={(value) =>
                                setMoveDraftByAssignment((prev) => ({
                                  ...prev,
                                  [assignment.id]: value,
                                }))
                              }
                              keyboardType='number-pad'
                              placeholder='New #'
                              placeholderTextColor={ui.colors.muted}
                              style={[styles.input, styles.moveInput]}
                            />
                            <AppButton
                              title={savingKey === `move-${assignment.id}` ? 'Moving...' : 'Move'}
                              onPress={() => moveFromTable(assignment)}
                              disabled={savingKey === `move-${assignment.id}`}
                              style={styles.button}
                            />
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
        </AppCard>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#E6F1F8' },
  content: { paddingBottom: ui.space.xl },
  card: { marginBottom: ui.space.sm },
  sectionTitle: { color: ui.colors.primary, fontWeight: '800', fontSize: 16, marginBottom: 10 },
  meta: { color: ui.colors.muted, marginTop: 4 },
  error: { color: ui.colors.danger, marginTop: 6 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  rowInput: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    height: 42,
    paddingHorizontal: 12,
    color: ui.colors.text,
  },
  button: { borderRadius: 10 },
  resultsWrap: { marginTop: 10 },
  resultRow: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 8,
    gap: 10,
  },
  resultInfo: { gap: 2 },
  resultTitle: { color: ui.colors.text, fontWeight: '700' },
  resultMeta: { color: ui.colors.muted, fontSize: 12 },
  tableBlock: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
  },
  tableTitle: { color: ui.colors.primary, fontWeight: '800', marginBottom: 6 },
  assignmentRow: {
    borderTopWidth: 1,
    borderTopColor: ui.colors.border,
    paddingTop: 10,
    marginTop: 10,
    gap: 8,
  },
  assignmentMain: { gap: 2 },
  assignmentActions: { gap: 8 },
  moveRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  moveInput: { flex: 1 },
});

