import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { EnquiryModal } from './EnquiryModal';
import { ConsultationModal } from './ConsultationModal';
import { CoupleProfileModal } from './CoupleProfileModal';
import { formatPaiseCompact } from 'shared';
import { 
  Users, 
  Calendar, 
  Search, 
  UserPlus, 
  Clock, 
  FileCheck, 
  Phone, 
  Mail,
  MapPin,
  RefreshCw
} from 'lucide-react';

interface EnquiryItem {
  id: string;
  coupleNames: string;
  primaryEmail: string;
  primaryPhone: string;
  source: string;
  roughDate: string;
  estimatedGuests: number;
  themePreference?: string;
  budgetCeilingPaise: string;
  status: 'NEW' | 'CONSULTATION_SCHEDULED' | 'AGREEMENT_SENT' | 'CONVERTED' | 'LOST';
  consultationDate?: string;
  notes?: string;
  couple?: {
    id: string;
    partnerOneName: string;
    partnerTwoName: string;
    email: string;
    phone: string;
  };
}

interface CoupleItem {
  id: string;
  partnerOneName: string;
  partnerTwoName: string;
  email: string;
  phone: string;
  address?: string;
  enquiry?: {
    roughDate: string;
    themePreference?: string;
    status: string;
  };
  serviceAgreement?: {
    id: string;
    packageType: string;
    isExecuted: boolean;
  };
  wedding?: {
    id: string;
    title: string;
    venueName: string;
    status: string;
  };
}

export const CrmModule: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'enquiries' | 'couples'>('enquiries');

  // Modal states
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [consultationTarget, setConsultationTarget] = useState<EnquiryItem | null>(null);
  const [convertTarget, setConvertTarget] = useState<EnquiryItem | null>(null);

  // Queries
  const { data: enquiries = [], isLoading: enquiriesLoading, refetch: refetchEnquiries } = useQuery<EnquiryItem[]>({
    queryKey: ['enquiries', statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      const res = await fetch(`/api/crm/enquiries?${params.toString()}`);
      const json = await res.json();
      return json.data || [];
    }
  });

  const { data: couples = [], isLoading: couplesLoading, refetch: refetchCouples } = useQuery<CoupleItem[]>({
    queryKey: ['couples'],
    queryFn: async () => {
      const res = await fetch('/api/crm/couples');
      const json = await res.json();
      return json.data || [];
    }
  });

  // Mutation for updating status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/crm/enquiries/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return <Badge variant="wine" dot>New Lead</Badge>;
      case 'CONSULTATION_SCHEDULED':
        return <Badge variant="warning" dot>Consultation Scheduled</Badge>;
      case 'AGREEMENT_SENT':
        return <Badge variant="gold" dot>Agreement Sent</Badge>;
      case 'CONVERTED':
        return <Badge variant="success" dot>Converted Client</Badge>;
      case 'LOST':
        return <Badge variant="danger" dot>Archived / Lost</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#5B1424]">VIP Client CRM & Enquiries</h2>
          <p className="text-xs text-[#718096]">
            Lead intake, consultation scheduling, and couple dossier management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              refetchEnquiries();
              refetchCouples();
            }}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsEnquiryModalOpen(true)}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Create VIP Enquiry
          </Button>
        </div>
      </div>

      {/* Sub-Tabs: Enquiries vs Couple Dossiers */}
      <div className="flex space-x-2 border-b border-[#E7E2D8]">
        <button
          onClick={() => setActiveTab('enquiries')}
          className={`pb-2 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'enquiries'
              ? 'border-[#5B1424] text-[#5B1424]'
              : 'border-transparent text-[#718096] hover:text-[#1E2229]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Active Inquiries ({enquiries.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('couples')}
          className={`pb-2 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'couples'
              ? 'border-[#5B1424] text-[#5B1424]'
              : 'border-transparent text-[#718096] hover:text-[#1E2229]'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Couple Dossiers ({couples.length})</span>
        </button>
      </div>

      {activeTab === 'enquiries' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card bodyClassName="p-3">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Search input */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#718096]" />
                <input
                  type="text"
                  placeholder="Search couples, email, phone, theme..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
                />
              </div>

              {/* Status pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {['ALL', 'NEW', 'CONSULTATION_SCHEDULED', 'AGREEMENT_SENT', 'CONVERTED', 'LOST'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-2.5 py-1 text-xs rounded transition-colors ${
                      statusFilter === status
                        ? 'bg-[#5B1424] text-white font-medium'
                        : 'bg-[#F7F4EE] text-[#4A5568] hover:bg-[#E7E2D8]'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Enquiries Table */}
          <Card>
            {enquiriesLoading ? (
              <div className="py-12 text-center text-xs text-[#718096]">
                Loading luxury enquiries...
              </div>
            ) : enquiries.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#718096]">
                No wedding enquiries found matching the criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F7F4EE] text-[#1E2229] border-b border-[#E7E2D8]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Couple & Contact</th>
                      <th className="px-4 py-3 font-semibold">Target Date</th>
                      <th className="px-4 py-3 font-semibold">Guests & Budget</th>
                      <th className="px-4 py-3 font-semibold">Preferences / Notes</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E2D8]">
                    {enquiries.map((enquiry) => (
                      <tr key={enquiry.id} className="hover:bg-amber-50/20">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#1E2229]">{enquiry.coupleNames}</div>
                          <div className="text-[11px] text-[#718096] flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" />
                            <span>{enquiry.primaryEmail}</span>
                          </div>
                          <div className="text-[11px] text-[#718096] flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            <span>{enquiry.primaryPhone}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-[#1E2229]">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#C5A059]" />
                            <span>{new Date(enquiry.roughDate).toLocaleDateString()}</span>
                          </div>
                          {enquiry.consultationDate && (
                            <div className="text-[11px] text-amber-800 flex items-center gap-1 mt-1 font-medium">
                              <Clock className="w-3 h-3" />
                              <span>Consult: {new Date(enquiry.consultationDate).toLocaleDateString()}</span>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-[#5B1424]">
                            {formatPaiseCompact(enquiry.budgetCeilingPaise)}
                          </div>
                          <div className="text-[11px] text-[#718096] mt-0.5">
                            ~{enquiry.estimatedGuests} Royal Guests
                          </div>
                        </td>

                        <td className="px-4 py-3 text-[#4A5568] max-w-xs">
                          {enquiry.themePreference && (
                            <div className="font-medium text-[#1E2229] truncate">{enquiry.themePreference}</div>
                          )}
                          {enquiry.notes && (
                            <div className="text-[11px] text-[#718096] line-clamp-2 mt-0.5">{enquiry.notes}</div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {getStatusBadge(enquiry.status)}
                        </td>

                        <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                          {enquiry.status === 'NEW' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setConsultationTarget(enquiry)}
                            >
                              Consult
                            </Button>
                          )}

                          {!enquiry.couple && (
                            <Button
                              variant="gold"
                              size="sm"
                              onClick={() => setConvertTarget(enquiry)}
                            >
                              Profile
                            </Button>
                          )}

                          {enquiry.status !== 'LOST' && enquiry.status !== 'CONVERTED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ id: enquiry.id, status: 'LOST' })}
                              className="text-stone-400 hover:text-rose-700"
                            >
                              Archive
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'couples' && (
        <Card>
          {couplesLoading ? (
            <div className="py-12 text-center text-xs text-[#718096]">Loading couple dossiers...</div>
          ) : couples.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#718096]">No couple dossiers created yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F7F4EE] text-[#1E2229] border-b border-[#E7E2D8]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Couple Names</th>
                    <th className="px-4 py-3 font-semibold">Contact Details</th>
                    <th className="px-4 py-3 font-semibold">Palace Address</th>
                    <th className="px-4 py-3 font-semibold">Agreement Status</th>
                    <th className="px-4 py-3 font-semibold">Wedding Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E2D8]">
                  {couples.map((couple) => (
                    <tr key={couple.id} className="hover:bg-amber-50/20">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#1E2229]">
                          {couple.partnerOneName} & {couple.partnerTwoName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#4A5568]">
                        <div>{couple.email}</div>
                        <div className="text-[11px] text-[#718096]">{couple.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-[#718096]">
                        {couple.address ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#C5A059]" />
                            <span>{couple.address}</span>
                          </div>
                        ) : (
                          <span className="italic text-stone-400">Not recorded</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {couple.serviceAgreement ? (
                          <Badge variant={couple.serviceAgreement.isExecuted ? 'success' : 'warning'} dot>
                            {couple.serviceAgreement.isExecuted ? 'Executed' : 'Pending Signature'}
                          </Badge>
                        ) : (
                          <Badge variant="neutral">Not Drafted</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {couple.wedding ? (
                          <Badge variant="wine" dot>{couple.wedding.venueName}</Badge>
                        ) : (
                          <span className="text-[11px] text-[#718096]">Pre-contract</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Modals */}
      <EnquiryModal
        isOpen={isEnquiryModalOpen}
        onClose={() => setIsEnquiryModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['enquiries'] });
        }}
      />

      {consultationTarget && (
        <ConsultationModal
          isOpen={!!consultationTarget}
          enquiryId={consultationTarget.id}
          coupleNames={consultationTarget.coupleNames}
          onClose={() => setConsultationTarget(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['enquiries'] });
          }}
        />
      )}

      {convertTarget && (
        <CoupleProfileModal
          isOpen={!!convertTarget}
          enquiryId={convertTarget.id}
          initialCoupleNames={convertTarget.coupleNames}
          initialEmail={convertTarget.primaryEmail}
          initialPhone={convertTarget.primaryPhone}
          onClose={() => setConvertTarget(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['enquiries'] });
            queryClient.invalidateQueries({ queryKey: ['couples'] });
          }}
        />
      )}
    </div>
  );
};
