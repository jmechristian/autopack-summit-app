import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { RegistrantStatus, RegistrantType, CompanyType } from '../../../../src/API';
import {
  AdminCompanyOption,
  createAdminCompanyAndAttach,
  createAdminRegistrant,
  listAdminCompanies,
} from '../../../../src/components/admin/registrants/adminRegistrantsService';
import { AppButton } from '../../../../src/ui/AppButton';
import { AppCard } from '../../../../src/ui/AppCard';
import { AppScreen } from '../../../../src/ui/AppScreen';
import { ui } from '../../../../src/ui/tokens';

const attendeeTypeOptions: RegistrantType[] = [
  RegistrantType.OEM,
  RegistrantType.TIER1,
  RegistrantType.SOLUTIONPROVIDER,
  RegistrantType.SPONSOR,
  RegistrantType.SPEAKER,
  RegistrantType.STAFF,
  RegistrantType.EXHIBITOR,
];

const statusOptions: RegistrantStatus[] = [
  RegistrantStatus.PENDING,
  RegistrantStatus.APPROVED,
  RegistrantStatus.REJECTED,
];

export default function AdminCreateRegistrantScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [attendeeType, setAttendeeType] = useState<RegistrantType>(RegistrantType.OEM);
  const [status, setStatus] = useState<RegistrantStatus>(RegistrantStatus.PENDING);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<AdminCompanyOption[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyEmail, setNewCompanyEmail] = useState('');
  const [newCompanyType, setNewCompanyType] = useState<CompanyType>(CompanyType.SOLUTIONPROVIDER);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const selectedCompanyName = useMemo(() => {
    return companies.find((c) => c.id === selectedCompanyId)?.name || 'No company selected';
  }, [companies, selectedCompanyId]);

  const loadCompanies = async () => {
    try {
      setPickerLoading(true);
      const rows = await listAdminCompanies();
      setCompanies(rows);
      setPickerVisible(true);
    } catch (e: any) {
      Alert.alert('Unable to load companies', e?.message || 'Please try again.');
    } finally {
      setPickerLoading(false);
    }
  };

  const handleCreateCompanyInline = async () => {
    if (!newCompanyName.trim()) {
      Alert.alert('Company name required', 'Please provide a company name.');
      return;
    }
    try {
      setCreatingCompany(true);
      const companyId = await createAdminCompanyAndAttach({
        name: newCompanyName,
        email: newCompanyEmail,
        type: newCompanyType,
      });
      const rows = await listAdminCompanies();
      setCompanies(rows);
      setSelectedCompanyId(companyId);
      setNewCompanyName('');
      setNewCompanyEmail('');
      Alert.alert('Company created', 'New company was created and selected.');
    } catch (e: any) {
      Alert.alert('Company create failed', e?.message || 'Please try again.');
    } finally {
      setCreatingCompany(false);
    }
  };

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      Alert.alert('Missing required fields', 'First name, last name, and email are required.');
      return;
    }

    try {
      setSubmitting(true);
      const created = await createAdminRegistrant({
        firstName,
        lastName,
        email,
        phone,
        companyId: selectedCompanyId,
        jobTitle,
        attendeeType,
        status,
      });
      setCreatedEmail(created.email);
      setTempPassword(created.tempPassword || null);
      Alert.alert('Registrant created', 'Registrant base record was created successfully.');
    } catch (e: any) {
      Alert.alert('Create failed', e?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Create Registrant</Text>
          <View style={styles.field}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput value={firstName} onChangeText={setFirstName} style={styles.input} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput value={lastName} onChangeText={setLastName} style={styles.input} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize='none'
              keyboardType='email-address'
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Phone</Text>
            <TextInput value={phone} onChangeText={setPhone} keyboardType='phone-pad' style={styles.input} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Job Title</Text>
            <TextInput value={jobTitle} onChangeText={setJobTitle} style={styles.input} />
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Company</Text>
          <Pressable style={styles.selectButton} onPress={loadCompanies} disabled={pickerLoading}>
            {pickerLoading ? <ActivityIndicator color={ui.colors.primary} /> : <Text style={styles.selectText}>{selectedCompanyName}</Text>}
          </Pressable>
          {selectedCompanyId ? (
            <Pressable onPress={() => setSelectedCompanyId(null)}>
              <Text style={styles.clearText}>Clear selection</Text>
            </Pressable>
          ) : null}
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Create Company Inline</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Company Name</Text>
            <TextInput value={newCompanyName} onChangeText={setNewCompanyName} style={styles.input} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Company Email</Text>
            <TextInput value={newCompanyEmail} onChangeText={setNewCompanyEmail} style={styles.input} />
          </View>
          <Text style={styles.label}>Company Type</Text>
          <View style={styles.chips}>
            {Object.values(CompanyType).map((option) => (
              <Pressable
                key={option}
                style={[styles.chip, newCompanyType === option && styles.chipActive]}
                onPress={() => setNewCompanyType(option)}
              >
                <Text style={[styles.chipText, newCompanyType === option && styles.chipTextActive]}>{option}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ marginTop: 10 }}>
            <AppButton
              title={creatingCompany ? 'Creating...' : 'Create Company'}
              onPress={handleCreateCompanyInline}
              disabled={creatingCompany}
              style={styles.adminButton}
            />
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Registrant Settings</Text>
          <Text style={styles.label}>Attendee Type *</Text>
          <View style={styles.chips}>
            {attendeeTypeOptions.map((option) => (
              <Pressable
                key={option}
                style={[styles.chip, attendeeType === option && styles.chipActive]}
                onPress={() => setAttendeeType(option)}
              >
                <Text style={[styles.chipText, attendeeType === option && styles.chipTextActive]}>{option}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.label, { marginTop: 10 }]}>Status *</Text>
          <View style={styles.chips}>
            {statusOptions.map((option) => (
              <Pressable
                key={option}
                style={[styles.chip, status === option && styles.chipActive]}
                onPress={() => setStatus(option)}
              >
                <Text style={[styles.chipText, status === option && styles.chipTextActive]}>{option}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ marginTop: 14 }}>
            <AppButton
              title={submitting ? 'Creating...' : 'Create Registrant'}
              onPress={submit}
              disabled={submitting}
              style={styles.adminButton}
            />
          </View>
        </AppCard>

        {createdEmail ? (
          <AppCard style={styles.card}>
            <Text style={styles.sectionTitle}>Creation Result</Text>
            <Text style={styles.resultLine}>Created email: {createdEmail}</Text>
            {tempPassword ? (
              <>
                <Text style={styles.resultLine}>Temporary password: {tempPassword}</Text>
                <View style={{ marginTop: 8 }}>
                  <AppButton
                    title='Copy temporary password'
                    variant='outline'
                    style={styles.adminButton}
                    onPress={async () => {
                      await Clipboard.setStringAsync(tempPassword);
                      Alert.alert('Copied', 'Temporary password copied to clipboard.');
                    }}
                  />
                </View>
              </>
            ) : (
              <Text style={styles.hint}>
                No temporary password returned. Existing Cognito user or backend orchestrator not yet connected.
              </Text>
            )}
          </AppCard>
        ) : null}
      </ScrollView>

      <Modal visible={pickerVisible} transparent animationType='slide' onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Company</Text>
            <ScrollView style={{ maxHeight: 340 }}>
              {companies.map((company) => (
                <Pressable
                  key={company.id}
                  style={styles.modalRow}
                  onPress={() => {
                    setSelectedCompanyId(company.id);
                    setPickerVisible(false);
                  }}
                >
                  <Text style={styles.modalRowTitle}>{company.name}</Text>
                  <Text style={styles.modalRowMeta}>{company.type || 'No type'}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <AppButton
                title='Close'
                variant='outline'
                style={styles.adminButton}
                onPress={() => setPickerVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#E6F1F8' },
  content: { paddingBottom: ui.space.xl },
  card: { marginBottom: ui.space.sm },
  sectionTitle: { color: ui.colors.primary, fontWeight: '800', fontSize: 16, marginBottom: 10 },
  field: { marginBottom: 10 },
  label: { color: ui.colors.muted, fontSize: 12, marginBottom: 6, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    height: 42,
    paddingHorizontal: 12,
    color: ui.colors.text,
  },
  selectButton: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 10,
    backgroundColor: '#fff',
    minHeight: 42,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  selectText: { color: ui.colors.text, fontWeight: '600' },
  clearText: { marginTop: 8, color: ui.colors.primary, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: ui.colors.primary, borderColor: ui.colors.primary },
  chipText: { color: ui.colors.text, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  resultLine: { color: ui.colors.text, marginBottom: 6 },
  adminButton: { borderRadius: 10 },
  hint: { color: ui.colors.muted, lineHeight: 18 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 14,
    maxHeight: '70%',
  },
  modalTitle: { fontWeight: '800', fontSize: 16, marginBottom: 10, color: ui.colors.primary },
  modalRow: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  modalRowTitle: { fontWeight: '700', color: ui.colors.text },
  modalRowMeta: { color: ui.colors.muted, fontSize: 12, marginTop: 2 },
  modalActions: { marginTop: 10 },
});

