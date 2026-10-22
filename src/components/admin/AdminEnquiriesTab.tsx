import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Search,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Layers,
  User,
} from 'lucide-react';
import { CustomerEnquiry } from '../../types.ts';
import {
  fetchAdminEnquiries,
  updateAdminEnquiryStatus,
  deleteAdminEnquiry,
} from '../../lib/api.ts';

interface AdminEnquiriesTabProps {
  onShowToast: (msg: string) => void;
}

export const AdminEnquiriesTab: React.FC<AdminEnquiriesTabProps> = ({ onShowToast }) => {
  const [enquiries, setEnquiries] = useState<CustomerEnquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'contacted' | 'resolved'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadEnquiries = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminEnquiries();
      setEnquiries(data || []);
    } catch (err: any) {
      console.error('Failed to load customer enquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnquiries();
  }, []);

  const handleStatusChange = async (id: string, newStatus: 'new' | 'contacted' | 'resolved') => {
    setUpdatingId(id);
    try {
      const updated = await updateAdminEnquiryStatus(id, newStatus);
      setEnquiries(prev => prev.map(item => (item.id === id ? updated : item)));
      onShowToast(`Enquiry marked as ${newStatus}`);
    } catch (err: any) {
      alert(err.message || 'Failed to update enquiry status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the enquiry from ${name}?`)) return;
    try {
      await deleteAdminEnquiry(id);
      setEnquiries(prev => prev.filter(item => item.id !== id));
      onShowToast('Enquiry deleted');
    } catch (err: any) {
      alert(err.message || 'Failed to delete enquiry');
    }
  };

  const counts = {
    all: enquiries.length,
    new: enquiries.filter(e => e.status === 'new').length,
    contacted: enquiries.filter(e => e.status === 'contacted').length,
    resolved: enquiries.filter(e => e.status === 'resolved').length,
  };

  const filteredEnquiries = enquiries.filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchPhone = item.phone.includes(q);
      const matchCity = item.city?.toLowerCase().includes(q);
      const matchMsg = item.message.toLowerCase().includes(q);
      const matchType = item.enquiryType?.toLowerCase().includes(q);
      const matchDoor = item.doorName?.toLowerCase().includes(q);
      return matchName || matchPhone || matchCity || matchMsg || matchType || matchDoor;
    }
    return true;
  });

  return (
    <div id="admin-enquiries-tab" className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5E5] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30 uppercase">
              Customer Enquiries Queue
            </span>
            <span className="text-xs text-[#666666]">Total: {enquiries.length}</span>
          </div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-white mt-1">
            Customer Inquiries & Leads
          </h3>
          <p className="text-xs text-[#666666] mt-0.5">
            Incoming door price inquiries, site measurement requests, and custom requirements submitted via Contact Us.
          </p>
        </div>

        <button
          onClick={loadEnquiries}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl bg-[#F8F8F6] hover:bg-stone-100 text-[#1A1A1A] text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#C89211]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === 'all'
                ? 'bg-[#C89211] text-white font-bold'
                : 'bg-white border border-[#E5E5E5] text-[#1A1A1A] hover:bg-[#F8F8F6]'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            onClick={() => setStatusFilter('new')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              statusFilter === 'new'
                ? 'bg-[#C89211] text-white font-bold'
                : 'bg-white border border-[#E5E5E5] text-[#C89211] hover:bg-[#F8F8F6]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            New ({counts.new})
          </button>
          <button
            onClick={() => setStatusFilter('contacted')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              statusFilter === 'contacted'
                ? 'bg-sky-500 text-white font-bold'
                : 'bg-white border border-[#E5E5E5] text-sky-400 hover:bg-[#F8F8F6]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            Contacted ({counts.contacted})
          </button>
          <button
            onClick={() => setStatusFilter('resolved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              statusFilter === 'resolved'
                ? 'bg-emerald-500 text-white font-bold'
                : 'bg-white border border-[#E5E5E5] text-emerald-400 hover:bg-[#F8F8F6]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Resolved ({counts.resolved})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search name, phone, city..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] text-xs focus:outline-none focus:border-[#C89211]"
          />
        </div>
      </div>

      {/* Enquiries List */}
      {filteredEnquiries.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-[#E5E5E5] space-y-3">
          <Inbox className="w-12 h-12 text-stone-600 mx-auto" />
          <h4 className="font-serif text-lg font-bold text-[#1A1A1A]">
            {searchTerm ? 'No enquiries match your search' : 'No enquiries found'}
          </h4>
          <p className="text-xs text-[#666666] max-w-sm mx-auto">
            When customers submit inquiries or site measurement bookings via the Contact Us form, they will appear here instantly.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEnquiries.map(enquiry => {
            const dateStr = new Date(enquiry.createdAt).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            const statusColors = {
              new: 'bg-[#FFF7E3] text-[#C89211] border-[#C89211]/40',
              contacted: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
              resolved: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
            };

            const cleanPhone = enquiry.phone.replace(/[^0-9]/g, '');
            const whatsappText = encodeURIComponent(
              `Hello ${enquiry.name}, thank you for contacting Jai Hanuman Door regarding your enquiry: "${enquiry.enquiryType || 'Door Inquiry'}". How can we assist you today?`
            );

            return (
              <div
                key={enquiry.id}
                className="p-5 rounded-2xl bg-white border border-[#E5E5E5] hover:border-[#E5E5E5] transition-colors shadow-lg space-y-4"
              >
                {/* Top Row: Name, Status Badge, Timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E5E5] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-[#C89211]/30 text-[#C89211] flex items-center justify-center font-serif font-bold text-base shrink-0">
                      {enquiry.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1A1A1A] text-sm flex items-center gap-2">
                        <span>{enquiry.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${statusColors[enquiry.status]}`}>
                          {enquiry.status}
                        </span>
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#666666] mt-0.5">
                        <span className="flex items-center gap-1 font-mono text-[#C89211] font-medium">
                          <Phone className="w-3 h-3" />
                          <a href={`tel:${enquiry.phone}`} className="hover:underline">
                            {enquiry.phone}
                          </a>
                        </span>
                        {enquiry.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <a href={`mailto:${enquiry.email}`} className="hover:underline">
                              {enquiry.email}
                            </a>
                          </span>
                        )}
                        {enquiry.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#666666]" />
                            {enquiry.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#666666] font-mono flex items-center gap-1.5 self-start sm:self-auto">
                    <Clock className="w-3 h-3" />
                    <span>{dateStr}</span>
                  </div>
                </div>

                {/* Enquiry Details & Message */}
                <div className="space-y-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5] text-[#C89211] font-semibold">
                      Purpose: {enquiry.enquiryType || 'General Inquiry'}
                    </span>
                    {enquiry.doorName && (
                      <span className="px-2.5 py-1 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5] text-[#1A1A1A]">
                        Door: <strong>{enquiry.doorName}</strong>
                      </span>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] text-[#1A1A1A] text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                    {enquiry.message}
                  </div>
                </div>

                {/* Bottom Row: Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  
                  {/* Status update toggle */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[#666666] mr-1 text-[11px]">Set Status:</span>
                    <button
                      disabled={updatingId === enquiry.id || enquiry.status === 'new'}
                      onClick={() => handleStatusChange(enquiry.id, 'new')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        enquiry.status === 'new'
                          ? 'bg-amber-500/30 text-[#C89211] border border-amber-500/50'
                          : 'bg-[#F8F8F6] border border-[#E5E5E5] text-[#666666] hover:text-[#1A1A1A]'
                      }`}
                    >
                      New
                    </button>
                    <button
                      disabled={updatingId === enquiry.id || enquiry.status === 'contacted'}
                      onClick={() => handleStatusChange(enquiry.id, 'contacted')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        enquiry.status === 'contacted'
                          ? 'bg-sky-500/30 text-sky-300 border border-sky-500/50'
                          : 'bg-[#F8F8F6] border border-[#E5E5E5] text-[#666666] hover:text-[#1A1A1A]'
                      }`}
                    >
                      Contacted
                    </button>
                    <button
                      disabled={updatingId === enquiry.id || enquiry.status === 'resolved'}
                      onClick={() => handleStatusChange(enquiry.id, 'resolved')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        enquiry.status === 'resolved'
                          ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                          : 'bg-[#F8F8F6] border border-[#E5E5E5] text-[#666666] hover:text-[#1A1A1A]'
                      }`}
                    >
                      Resolved
                    </button>
                  </div>

                  {/* Direct Contact & Delete buttons */}
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${enquiry.phone}`}
                      className="px-3 py-1.5 rounded-xl bg-[#F8F8F6] hover:bg-stone-100 text-[#1A1A1A] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#C89211]" />
                      <span>Call</span>
                    </a>

                    <a
                      href={`https://wa.me/${cleanPhone}?text=${whatsappText}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>WhatsApp</span>
                    </a>

                    <button
                      onClick={() => handleDelete(enquiry.id, enquiry.name)}
                      className="p-1.5 rounded-xl bg-[#F8F8F6] hover:bg-red-950/70 border border-[#E5E5E5] hover:border-red-800 text-[#666666] hover:text-red-400 transition-colors"
                      title="Delete enquiry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
