import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { paymentsApi } from '../utils/api';

interface PaymentStats {
  totalPendingPayments: number;
  totalCompletedPayments: number;
  totalPaymentValue: number;
  pendingPaymentValue: number;
}

interface PendingPayment {
  id: number;
  amount: number;
  platformFee: number;
  payoutAmount: number;
  status: string;
  createdAt: string;
  serviceRequest: {
    id: number;
    message: string;
    client: {
      firstName: string;
      lastName: string;
    };
    provider: {
      firstName: string;
      lastName: string;
    };
  };
}

const PaymentApproverScreen: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.role === 'payment_approver') {
      loadPaymentData();
    }
  }, [user]);

  const loadPaymentData = async () => {
    try {
      setIsLoading(true);
      
      // Load payment statistics
      const statsResponse = await paymentsApi.getStats();
      setStats(statsResponse);
      
      // Load pending payments
      const pendingResponse = await paymentsApi.getPendingPayments();
      setPendingPayments(pendingResponse || []);
      
    } catch (error) {
      console.error('Error loading payment data:', error);
      Alert.alert('Error', 'Failed to load payment data');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPaymentData();
    setRefreshing(false);
  };

  const handleApprovePayment = async (paymentId: number) => {
    try {
      await paymentsApi.approvePayment(paymentId);
      Alert.alert('Success', 'Payment approved successfully');
      loadPaymentData();
    } catch (error) {
      console.error('Error approving payment:', error);
      Alert.alert('Error', 'Failed to approve payment');
    }
  };

  const handleRejectPayment = async (paymentId: number) => {
    try {
      await paymentsApi.rejectPayment(paymentId);
      Alert.alert('Success', 'Payment rejected successfully');
      loadPaymentData();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      Alert.alert('Error', 'Failed to reject payment');
    }
  };

  if (user?.role !== 'payment_approver') {
    return (
      <View style={styles.container}>
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={48} color="#EF4444" />
          <Text style={styles.accessDeniedText}>Access Denied</Text>
          <Text style={styles.accessDeniedSubtext}>
            You don't have permission to access this section
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading payment data...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Payment Approver Dashboard</Text>
        <Text style={styles.subtitle}>Manage payment approvals</Text>
      </View>

      {/* Stats Cards */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="time" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>{stats.totalPendingPayments}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              </View>
              <Text style={styles.statValue}>{stats.totalCompletedPayments}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="card" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.statValue}>${stats.totalPaymentValue}</Text>
              <Text style={styles.statLabel}>Total Value</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="hourglass" size={20} color="#EF4444" />
              </View>
              <Text style={styles.statValue}>${stats.pendingPaymentValue}</Text>
              <Text style={styles.statLabel}>Pending Value</Text>
            </View>
          </View>
        </View>
      )}

      {/* Pending Payments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Payments</Text>
        
        {pendingPayments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            <Text style={styles.emptyStateText}>No pending payments</Text>
            <Text style={styles.emptyStateSubtext}>All payments are up to date</Text>
          </View>
        ) : (
          pendingPayments.map((payment) => (
            <View key={payment.id} style={styles.paymentCard}>
              <View style={styles.paymentHeader}>
                <Text style={styles.paymentAmount}>${payment.amount}</Text>
                <Text style={styles.paymentStatus}>{payment.status}</Text>
              </View>
              
              <View style={styles.paymentDetails}>
                <Text style={styles.paymentText}>
                  Client: {payment.serviceRequest.client.firstName} {payment.serviceRequest.client.lastName}
                </Text>
                <Text style={styles.paymentText}>
                  Provider: {payment.serviceRequest.provider.firstName} {payment.serviceRequest.provider.lastName}
                </Text>
                <Text style={styles.paymentText}>
                  Service: {payment.serviceRequest.message}
                </Text>
                <Text style={styles.paymentText}>
                  Platform Fee: ${payment.platformFee}
                </Text>
                <Text style={styles.paymentText}>
                  Payout Amount: ${payment.payoutAmount}
                </Text>
              </View>

              <View style={styles.paymentActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleApprovePayment(payment.id)}
                >
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Approve</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleRejectPayment(payment.id)}
                >
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
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
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginTop: 16,
  },
  accessDeniedSubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  statsContainer: {
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  paymentStatus: {
    fontSize: 14,
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  paymentDetails: {
    marginBottom: 16,
  },
  paymentText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  paymentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default PaymentApproverScreen;