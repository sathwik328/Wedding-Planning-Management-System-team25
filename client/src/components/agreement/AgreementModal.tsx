import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { SignatureCanvas } from './SignatureCanvas';
import { parseStrictIndianCurrencyToPaise, formatPaiseToINR } from 'shared';
import { CheckCircle2, FileSignature, Hash } from 'lucide-react';

export interface AgreementModalProps {
  isOpen: boolean;
  coupleId: string;
  coupleNames: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ServiceAgreementData {
  id: string;
  coupleId: string;
  packageType: 'FULL_SERVICE' | 'PARTIAL_DAY_OF';
  agreedFeePaise: string;
  paymentTerms: string;
  version: number;
  agreementHash?: string;
  signatureDataUrl?: string;
  signedByName?: string;
  signedAt?: string;
  isExecuted: boolean;
}

export const AgreementModal: React.FC<AgreementModalProps> = ({
  isOpen,
  coupleId,
  coupleNames,
  onClose,
  onSuccess
}) => {
  const [agreement, setAgreement] = useState<ServiceAgreementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [packageType, setPackageType] = useState<'FULL_SERVICE' | 'PARTIAL_DAY_OF'>('FULL_SERVICE');
  const [feeRupees, setFeeRupees] = useState('45,00,000');
  const [paymentTerms, setPaymentTerms] = useState('25% on execution, 50% 60 days before Day-1, 25% on wedding commencement');
  const [signerName, setSignerName] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Mode: 'view' | 'draft' | 'sign'
  const [activeStep, setActiveStep] = useState<'review' | 'sign'>('review');

  const fetchAgreement = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agreements/by-couple/${coupleId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setAgreement(json.data);
          setPackageType(json.data.packageType);
          setPaymentTerms(json.data.paymentTerms);
        }
      }
    } catch {
      // Agreement might not exist yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && coupleId) {
      fetchAgreement();
    }
  }, [isOpen, coupleId]);

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const agreedFeePaise = parseStrictIndianCurrencyToPaise(feeRupees);
      const res = await fetch('/api/agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupleId,
          packageType,
          agreedFeePaise,
          paymentTerms
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save agreement draft');
      }

      setAgreement(data.data);
      setActiveStep('sign');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteSignature = async () => {
    if (!agreement?.id) return;
    if (!signatureData) {
      setError('Please provide a handwritten signature on the canvas below.');
      return;
    }
    if (!signerName.trim()) {
      setError('Please enter the full legal name of the signing party.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/agreements/${agreement.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureDataUrl: signatureData,
          signedByName: signerName,
          termsVersion: agreement.version
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute agreement');
      }

      setAgreement(data.data);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Signature execution failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Digital Service Agreement"
      subtitle={`Legal execution for ${coupleNames}`}
      maxWidth="2xl"
    >
      <div className="space-y-6 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-[#718096]">Loading agreement status...</div>
        ) : agreement?.isExecuted ? (
          /* Executed Seal State */
          <div className="space-y-4">
            <div className="p-5 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-950 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                  <span className="font-serif text-lg font-bold">Legally Executed & Audited</span>
                </div>
                <Badge variant="success">Version {agreement.version}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-emerald-200">
                <div>
                  <span className="text-emerald-800 font-medium">Package Tier:</span>
                  <div className="font-bold">{agreement.packageType.replace('_', ' ')}</div>
                </div>
                <div>
                  <span className="text-emerald-800 font-medium">Agreed Planning Fee:</span>
                  <div className="font-mono font-bold">{formatPaiseToINR(agreement.agreedFeePaise)}</div>
                </div>
                <div>
                  <span className="text-emerald-800 font-medium">Authorized Signatory:</span>
                  <div className="font-semibold">{agreement.signedByName}</div>
                </div>
                <div>
                  <span className="text-emerald-800 font-medium">Executed On:</span>
                  <div>{agreement.signedAt ? new Date(agreement.signedAt).toLocaleString() : 'N/A'}</div>
                </div>
              </div>

              {agreement.agreementHash && (
                <div className="pt-2 border-t border-emerald-200 text-[11px] font-mono text-emerald-800 break-all flex items-start gap-1.5">
                  <Hash className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>SHA-256 Hash: {agreement.agreementHash}</span>
                </div>
              )}
            </div>

            {/* Render Saved Signature Image */}
            {agreement.signatureDataUrl && (
              <div className="p-4 bg-white border border-[#E7E2D8] rounded-md text-center">
                <span className="text-[11px] font-semibold text-[#718096] uppercase tracking-wider block mb-2">
                  Digital Signature Cryptographic Stamp
                </span>
                <img
                  src={agreement.signatureDataUrl}
                  alt="Executed Signature"
                  className="max-h-24 mx-auto border-b border-[#5B1424]/30"
                />
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close Dossier
              </Button>
            </div>
          </div>
        ) : (
          /* Draft or Sign Form */
          <div className="space-y-4">
            {/* Step Selector */}
            <div className="flex space-x-2 border-b border-[#E7E2D8] pb-2">
              <button
                type="button"
                onClick={() => setActiveStep('review')}
                className={`px-3 py-1 text-xs font-semibold rounded ${
                  activeStep === 'review' ? 'bg-[#5B1424] text-white' : 'text-[#718096]'
                }`}
              >
                1. Scope & Terms Configuration
              </button>
              <button
                type="button"
                onClick={() => agreement && setActiveStep('sign')}
                disabled={!agreement}
                className={`px-3 py-1 text-xs font-semibold rounded disabled:opacity-40 ${
                  activeStep === 'sign' ? 'bg-[#5B1424] text-white' : 'text-[#718096]'
                }`}
              >
                2. Digital Signature Execution
              </button>
            </div>

            {activeStep === 'review' ? (
              <form onSubmit={handleSaveDraft} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-[#1E2229] mb-1">Package Tier *</label>
                    <select
                      className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none bg-white"
                      value={packageType}
                      onChange={(e) => setPackageType(e.target.value as any)}
                    >
                      <option value="FULL_SERVICE">Full Service Luxury (32 Milestone Pipeline)</option>
                      <option value="PARTIAL_DAY_OF">Partial / Day-of Execution (20 Milestone Pipeline)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-[#1E2229] mb-1">
                      Agreed Planning Fee (INR) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 45,00,000"
                      className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none font-mono"
                      value={feeRupees}
                      onChange={(e) => setFeeRupees(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-medium text-[#1E2229] mb-1">Payment Schedule & Terms *</label>
                    <textarea
                      rows={3}
                      required
                      className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-[#E7E2D8]">
                  <span className="text-[#718096] text-[11px]">
                    Drafting agreement establishes hash checksum and locks commercial terms.
                  </span>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" type="button" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
                      Save & Proceed to Signature
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50/50 border border-amber-200 rounded text-amber-900 text-xs">
                  <div className="font-semibold mb-1">Legal Declaration & Acceptance:</div>
                  <p className="leading-relaxed text-[11px]">
                    By signing below, the undersigned acknowledges and accepts The Royal Knot luxury planning mandate,
                    authorizing vendor negotiations and milestone management according to the executed terms.
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-[#1E2229] mb-1">Authorized Signer Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikramaditya Rathore"
                    className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#1E2229] mb-1">Handwritten Signature Canvas *</label>
                  <SignatureCanvas onSignatureChange={setSignatureData} />
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-[#E7E2D8]">
                  <Button variant="ghost" size="sm" onClick={() => setActiveStep('review')}>
                    Back to Terms
                  </Button>
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={handleExecuteSignature}
                    isLoading={submitting}
                    disabled={!signatureData || !signerName.trim()}
                    leftIcon={<FileSignature className="w-4 h-4" />}
                  >
                    Execute Digital Signature
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
