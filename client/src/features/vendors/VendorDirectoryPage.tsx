import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { RfqComparisonModal, RfqComparisonMatrixData } from './RfqComparisonModal';
import { CreateVendorModal } from './CreateVendorModal';
import { CreateRfqModal } from './CreateRfqModal';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  Eye
} from 'lucide-react';
import { VENDOR_CATEGORIES } from 'shared';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../services/api';

export interface VendorItem {
  id: string;
  businessName: string;
  category: string;
  contactPerson: string;
  phone: string;
  email: string;
  city: string;
  notes?: string | null;
  _count?: {
    quotations: number;
    weddingVendors: number;
  };
}

export interface RfqGroupItem {
  id: string;
  title: string;
  category: string;
  targetGuestCount: number;
  status: string;
  awardedQuotationId?: string | null;
  requests: Array<{
    id: string;
    vendorId: string;
    status: string;
    vendor: {
      id: string;
      businessName: string;
    };
    quotation?: {
      id: string;
      baseAmountPaise: string;
      isSelectedWinner: boolean;
    } | null;
  }>;
}

export interface WeddingSummaryItem {
  id: string;
  title: string;
  targetGuestCount: number;
  primaryCity: string;
}

export const VendorDirectoryPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canCreateVendor = hasPermission('procurement:vendor:create');
  const canCreateRfq = hasPermission('procurement:rfq:create');
  const canReadRfq = hasPermission('procurement:rfq:read');

  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [rfqGroups, setRfqGroups] = useState<RfqGroupItem[]>([]);
  const [weddings, setWeddings] = useState<WeddingSummaryItem[]>([]);
  const [selectedWeddingId, setSelectedWeddingId] = useState<string>('');

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isCreateVendorOpen, setIsCreateVendorOpen] = useState(false);
  const [isCreateRfqOpen, setIsCreateRfqOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [comparisonData, setComparisonData] = useState<RfqComparisonMatrixData | null>(null);
  const [isComparisonLoading, setIsComparisonLoading] = useState(false);

  const fetchVendors = async () => {
    try {
      let url = '/api/vendors';
      const params = new URLSearchParams();
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setVendors(data);
      }
    } catch (err) {
      console.error('Failed to load vendors', err);
    }
  };

  const fetchWeddings = async () => {
    try {
      const res = await apiFetch('/api/weddings');
      if (res.ok) {
        const json = await res.json();
        const rawList = Array.isArray(json) ? json : json.data || [];
        const list: WeddingSummaryItem[] = rawList.map((w: any) => ({
          id: w.id,
          title: w.title,
          targetGuestCount: w.targetGuestCount || 400,
          primaryCity: w.primaryCity || 'Jaipur'
        }));
        setWeddings(list);
        if (list.length > 0 && !selectedWeddingId) {
          setSelectedWeddingId(list[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch weddings', err);
    }
  };

  const fetchRfqGroups = async (weddingId: string) => {
    if (!weddingId || !canReadRfq) return;
    try {
      const res = await apiFetch(`/api/rfq/groups/wedding/${weddingId}`);
      if (res.ok) {
        const data = await res.json();
        setRfqGroups(data);
      }
    } catch (err) {
      console.error('Failed to load RFQ groups', err);
    }
  };

  useEffect(() => {
    Promise.all([fetchVendors(), fetchWeddings()]);
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [categoryFilter, searchQuery]);

  useEffect(() => {
    if (selectedWeddingId && canReadRfq) {
      fetchRfqGroups(selectedWeddingId);
    }
  }, [selectedWeddingId, canReadRfq]);

  const handleOpenComparison = async (groupId: string) => {
    setIsComparisonLoading(true);
    setIsComparisonOpen(true);
    try {
      const res = await apiFetch(`/api/rfq/groups/${groupId}/comparison`);
      if (res.ok) {
        const data = await res.json();
        setComparisonData(data);
      }
    } catch (err) {
      console.error('Failed to load comparison', err);
    } finally {
      setIsComparisonLoading(false);
    }
  };

  const handleAwardVendor = async (groupId: string, quotationId: string) => {
    const res = await apiFetch(`/api/rfq/groups/${groupId}/award`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quotationId })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to award vendor');
    }

    // Refresh RFQ comparison and list
    await handleOpenComparison(groupId);
    if (selectedWeddingId) {
      await fetchRfqGroups(selectedWeddingId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-light text-[#231E1B]">
            Vendor Directory & RFQ Management
          </h2>
          <p className="text-xs text-[#7A6E63] mt-0.5">
            Procurement & Tenders • Master vendor directory, competitive quotation comparison, and contract awards
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canCreateVendor && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateVendorOpen(true)}
            >
              Add Vendor
            </Button>
          )}
          {canCreateRfq && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<FileSpreadsheet className="w-4 h-4" />}
              onClick={() => setIsCreateRfqOpen(true)}
            >
              Create RFQ Group
            </Button>
          )}
        </div>
      </div>

      {/* RFQ Groups Section */}
      <Card
        title="Active RFQ Quotation Groups & 3-Vendor Comparison Matrix"
        subtitle="Manage quotation tenders, compare price per plate and inclusions side-by-side, and award winning partners."
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#7A6E63] font-medium hidden sm:inline">Wedding:</span>
            <select
              value={selectedWeddingId}
              onChange={(e) => setSelectedWeddingId(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-[#EDE5DC] rounded bg-white font-medium text-[#231E1B] focus:outline-none focus:ring-1 focus:ring-[#B89358]"
            >
              {weddings.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title} ({w.primaryCity})
                </option>
              ))}
            </select>
          </div>
        }
      >
        {rfqGroups.length === 0 ? (
          <div className="text-center py-8 bg-[#FAF8F5] rounded border border-dashed border-[#EDE5DC]">
            <FileSpreadsheet className="w-10 h-10 text-[#B89358] mx-auto mb-2 opacity-60" />
            <p className="font-serif text-sm font-semibold text-[#231E1B]">
              No RFQ groups created for this wedding yet
            </p>
            <p className="text-xs text-[#7A6E63] max-w-md mx-auto mt-1 mb-4">
              Create an RFQ group to invite 3 luxury vendors and compare line-by-line menus, base costs, and extra-hour charges.
            </p>
            {canCreateRfq && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setIsCreateRfqOpen(true)}
              >
                Dispatch First RFQ
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#FAF6F1] text-[#231E1B] border-b border-[#EDE5DC]">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">RFQ Title</th>
                  <th className="px-4 py-2.5 font-semibold">Category</th>
                  <th className="px-4 py-2.5 font-semibold">Target Guests</th>
                  <th className="px-4 py-2.5 font-semibold">Proposals Received</th>
                  <th className="px-4 py-2.5 font-semibold">Tender Status</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDE5DC]">
                {rfqGroups.map((group) => {
                  const quotesCount = group.requests.filter((r) => r.quotation).length;
                  const totalRequests = group.requests.length;
                  const isAwarded = group.status === 'AWARDED';

                  return (
                    <tr key={group.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="px-4 py-3 font-medium text-[#231E1B]">{group.title}</td>
                      <td className="px-4 py-3">
                        <Badge variant="gold" size="sm">
                          {group.category.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono">{group.targetGuestCount} Pax</td>
                      <td className="px-4 py-3 font-mono font-medium">
                        {quotesCount} / {totalRequests} Received
                      </td>
                      <td className="px-4 py-3">
                        {isAwarded ? (
                          <Badge variant="success" size="sm" dot>
                            Awarded & Linked
                          </Badge>
                        ) : quotesCount >= 2 ? (
                          <Badge variant="warning" size="sm" dot>
                            Ready to Compare
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            Awaiting Quotes
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenComparison(group.id)}
                        >
                          {isAwarded ? 'View Contract' : 'Compare Quotes'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Vendor Master Directory */}
      <Card
        title="Curated Master Vendor Directory"
        subtitle="Exclusive network of Rajasthani heritage caterers, royal floral production designers, sound engineers, and artists."
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#7A6E63] absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search vendor or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs pl-8 pr-3 py-1.5 border border-[#EDE5DC] rounded bg-white text-[#231E1B] focus:outline-none focus:ring-1 focus:ring-[#B89358]"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-[#EDE5DC] rounded bg-white text-[#231E1B] focus:outline-none focus:ring-1 focus:ring-[#B89358]"
            >
              <option value="ALL">All Categories</option>
              {VENDOR_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {vendors.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#7A6E63]">
            No vendors matching selected criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((v) => (
              <div
                key={v.id}
                className="border border-[#EDE5DC] rounded-md p-4 bg-white hover:border-[#B89358] transition-all hover:shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="gold" size="sm">
                      {v.category.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-[11px] font-medium text-[#7A6E63] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#B89358]" />
                      {v.city}
                    </span>
                  </div>

                  <h4 className="font-serif font-bold text-[#231E1B] text-base mb-1">
                    {v.businessName}
                  </h4>

                  <div className="space-y-1 text-xs text-[#4A5568] mb-3">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 text-[#7A6E63]" />
                      <span>{v.contactPerson}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-[#7A6E63]" />
                      <span>{v.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-[#7A6E63]" />
                      <span className="truncate">{v.email}</span>
                    </div>
                  </div>

                  {v.notes && (
                    <p className="text-[11px] text-[#7A6E63] italic bg-[#FAF6F1] p-2 rounded line-clamp-2">
                      {v.notes}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#EDE5DC] flex items-center justify-between text-[11px] text-[#7A6E63]">
                  <span>{v._count?.weddingVendors || 0} Contracts Awarded</span>
                  <span className="font-mono">{v._count?.quotations || 0} Proposals</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modals */}
      <CreateVendorModal
        isOpen={isCreateVendorOpen}
        onClose={() => setIsCreateVendorOpen(false)}
        onVendorCreated={fetchVendors}
      />

      <CreateRfqModal
        isOpen={isCreateRfqOpen}
        onClose={() => setIsCreateRfqOpen(false)}
        weddings={weddings}
        vendors={vendors}
        selectedWeddingId={selectedWeddingId}
        onRfqCreated={() => {
          if (selectedWeddingId) fetchRfqGroups(selectedWeddingId);
        }}
      />

      <RfqComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        data={comparisonData}
        isLoading={isComparisonLoading}
        onAwardVendor={handleAwardVendor}
      />
    </div>
  );
};
