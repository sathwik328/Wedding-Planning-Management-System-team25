import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { VENDOR_CATEGORIES, VendorCategory } from 'shared';
import { apiFetch } from '../../services/api';

export interface CreateVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVendorCreated: () => void;
}

export const CreateVendorModal: React.FC<CreateVendorModalProps> = ({
  isOpen,
  onClose,
  onVendorCreated
}) => {
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState<VendorCategory>('CATERING');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Jaipur');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await apiFetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          category,
          contactPerson,
          phone,
          email,
          city,
          notes
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create vendor');
      }

      onVendorCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register Luxury Partner / Vendor"
      subtitle="Onboard a curated Rajasthani wedding artisan or hospitality provider"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#1E2229] mb-1">Business Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. Rajputana Royal Caterers"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-[#E7E2D8] rounded focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1E2229] mb-1">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as VendorCategory)}
              className="w-full text-xs px-3 py-2 border border-[#E7E2D8] rounded focus:outline-none focus:ring-1 focus:ring-[#C5A059] bg-white"
            >
              {VENDOR_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E2229] mb-1">Primary City *</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-[#E7E2D8] rounded focus:outline-none focus:ring-1 focus:ring-[#C5A059] bg-white"
            >
              <option value="Jaipur">Jaipur</option>
              <option value="Udaipur">Udaipur</option>
              <option value="Jodhpur">Jodhpur</option>
              <option value="Delhi">Delhi</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1E2229] mb-1">Contact Person *</label>
            <input
              type="text"
              required
              placeholder="e.g. Chef Mahendra Singh"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-[#E7E2D8] rounded focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E2229] mb-1">Phone Number *</label>
            <input
              type="tel"
              required
              placeholder="+919829000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-[#E7E2D8] rounded focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1E2229] mb-1">Email Address *</label>
          <input
            type="email"
            required
            placeholder="vendor@royalknot.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-[#E7E2D8] rounded focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1E2229] mb-1">Specialties & Notes</label>
          <textarea
            rows={2}
            placeholder="Specializes in live tandoor and copper thali service for 400+ guests..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-[#E7E2D8] rounded focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#E7E2D8]">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
            Save Vendor
          </Button>
        </div>
      </form>
    </Modal>
  );
};
