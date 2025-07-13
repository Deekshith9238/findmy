import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../utils/api';

interface EscrowPayment {
  id: number;
  serviceRequestId: number;
  amount: number;
  platformFee: number;
  tax: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  serviceRequest: {
    id: number;
    title: string;
    description: string;
    clientId: number;
    providerId: number;
    client: {
      firstName: string;
      lastName: string;
      email: string;
    };
    provider: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  workCompletionPhotos: Array<{
    id: number;
    photoUrl: string;
    description: string;
    createdAt: string;
  }>;
}

const PaymentApproverScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [payments, setPayments] = useState<EscrowPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<EscrowPayment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadPayments = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('GET', '/api/payments/pending');
      setPayments(response);
    } catch (error) {
      console.error('Error loading payments:', error);
      Alert.alert('Error', 'Failed to load payments. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'payment_approver') {
      loadPayments();
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  };

  const handlePaymentAction = async (paymentId: number, action: 'approve' | 'reject', reason?: string) => {
    try {
      await apiRequest('POST', `/api/payments/${paymentId}/${action}`, {
        reason: reason || null
      });
      
      Alert.alert(
        'Success',
        `Payment ${action}d successfully`,
        [{ text: 'OK' }]
      );
      
      setModalVisible(false);
      setSelectedPayment(null);
      loadPayments();
    } catch (error) {
      console.error(`Error ${action}ing payment:`, error);
      Alert.alert('Error', `Failed to ${action} payment. Please try again.`);
    }
  };

  const showPaymentDetails = (payment: EscrowPayment) => {
    setSelectedPayment(payment);
    setModalVisible(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#FEF3C7';
      case 'approved':
        return '#D1FAE5';
      case 'rejected':
        return '#FEE2E2';
      default:
        return '#F3F4F6';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#F59E0B';
      case 'approved':
        return '#059669';
      case 'rejected':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const renderPaymentItem = ({ item }: { item: EscrowPayment }) => (
    <TouchableOpacity
      style={styles.paymentCard}
      onPress={() => showPaymentDetails(item)}
    >
      <View style={styles.paymentHeader}>
        <Text style={styles.paymentTitle}>{item.serviceRequest.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={[styles.statusText, { color: getStatusTextColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>
      
      <Text style={styles.paymentDescription} numberOfLines={2}>
        {item.serviceRequest.description}
      </Text>
      
      <View style={styles.paymentDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Client:</Text>
          <Text style={styles.detailValue}>
            {item.serviceRequest.client.firstName} {item.serviceRequest.client.lastName}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Provider:</Text>
          <Text style={styles.detailValue}>
            {item.serviceRequest.provider.firstName} {item.serviceRequest.provider.lastName}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount:</Text>
          <Text style={styles.amountText}>{formatCurrency(item.totalAmount)}</Text>
        </View>
      </View>
      
      <View style={styles.paymentFooter}>
        <Text style={styles.dateText}>
          {formatDate(item.createdAt)}
        </Text>
        <View style={styles.photoIndicator}>
          <Ionicons name="images" size={16} color="#6B7280" />
          <Text style={styles.photoCount}>
            {item.workCompletionPhotos.length} photos
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPaymentModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Payment Details</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          {selectedPayment && (
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Service Request</Text>
                <Text style={styles.serviceTitle}>{selectedPayment.serviceRequest.title}</Text>
                <Text style={styles.serviceDescription}>
                  {selectedPayment.serviceRequest.description}
                </Text>
              </View>
              
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Payment Breakdown</Text>
                <View style={styles.paymentBreakdown}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Service Amount:</Text>
                    <Text style={styles.breakdownValue}>{formatCurrency(selectedPayment.amount)}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Platform Fee (15%):</Text>
                    <Text style={styles.breakdownValue}>{formatCurrency(selectedPayment.platformFee)}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Tax (8%):</Text>
                    <Text style={styles.breakdownValue}>{formatCurrency(selectedPayment.tax)}</Text>
                  </View>
                  <View style={[styles.breakdownRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total Amount:</Text>
                    <Text style={styles.totalValue}>{formatCurrency(selectedPayment.totalAmount)}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Parties</Text>
                <View style={styles.partyInfo}>
                  <Text style={styles.partyLabel}>Client:</Text>
                  <Text style={styles.partyName}>
                    {selectedPayment.serviceRequest.client.firstName} {selectedPayment.serviceRequest.client.lastName}
                  </Text>
                  <Text style={styles.partyEmail}>
                    {selectedPayment.serviceRequest.client.email}
                  </Text>
                </View>
                <View style={styles.partyInfo}>
                  <Text style={styles.partyLabel}>Provider:</Text>
                  <Text style={styles.partyName}>
                    {selectedPayment.serviceRequest.provider.firstName} {selectedPayment.serviceRequest.provider.lastName}
                  </Text>
                  <Text style={styles.partyEmail}>
                    {selectedPayment.serviceRequest.provider.email}
                  </Text>
                </View>
              </View>
              
              {selectedPayment.workCompletionPhotos.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Work Completion Photos</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {selectedPayment.workCompletionPhotos.map((photo, index) => (
                      <View key={photo.id} style={styles.photoContainer}>
                        <Image
                          source={{ uri: photo.photoUrl }}
                          style={styles.photo}
                          resizeMode="cover"
                        />
                        <Text style={styles.photoDescription} numberOfLines={2}>
                          {photo.description}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </ScrollView>
          )}
          
          {selectedPayment?.status === 'pending' && (
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => handlePaymentAction(selectedPayment.id, 'reject')}
              >
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.approveButton}
                onPress={() => handlePaymentAction(selectedPayment.id, 'approve')}
              >
                <Text style={styles.approveButtonText}>Approve</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading payments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payment Approvals</Text>
        <Text style={styles.headerSubtitle}>
          {payments.length} payment{payments.length !== 1 ? 's' : ''} pending review
        </Text>
      </View>

      <FlatList
        data={payments}
        renderItem={renderPaymentItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No pending payments</Text>
            <Text style={styles.emptySubtitle}>
              All payments have been reviewed and processed.
            </Text>
          </View>
        }
      />

      {renderPaymentModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  listContainer: {
    paddingBottom: 16,
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  paymentDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  paymentDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  photoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoCount: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalBody: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  paymentBreakdown: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  breakdownValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  partyInfo: {
    marginBottom: 16,
  },
  partyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  partyName: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 2,
  },
  partyEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  photoContainer: {
    width: 120,
    marginRight: 12,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  photoDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 32,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PaymentApproverScreen;