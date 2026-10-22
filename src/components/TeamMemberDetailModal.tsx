import React, { useEffect } from 'react';
import {
  X,
  ArrowLeft,
  Briefcase,
  Award,
  CheckCircle2,
  Linkedin,
  Instagram,
  Facebook,
  Youtube,
  Mail,
  Play,
  Phone,
  MessageCircle,
} from 'lucide-react';
import { TeamMember, BusinessSettings } from '../types.ts';
import { getWhatsAppUrl } from '../lib/contactUtils.ts';

interface TeamMemberDetailModalProps {
  member: TeamMember | null;
  onClose: () => void;
  settings?: BusinessSettings;
}

export const TeamMemberDetailModal: React.FC<TeamMemberDetailModalProps> = ({
  member,
  onClose,
  settings,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!member) return null;

  const whatsappUrl = getWhatsAppUrl(
    settings?.whatsappNumber || settings?.phone || '7887412884',
    `Hello ${settings?.businessName || 'Jai Hanuman Door'}! I viewed the profile of ${member.name} (${member.designation}) and would like to discuss door requirements.`
  );

  return (
    <div
      id="team-detail-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="team-detail-modal-card"
        className="relative w-full max-w-3xl bg-white border border-[#E5E5E5] rounded-3xl shadow-2xl overflow-hidden text-[#1A1A1A] my-8 transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar with Back button and Close button */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-[#E5E5E5] bg-white sticky top-0 z-10">
          <button
            id="team-modal-back-btn"
            onClick={onClose}
            className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[#1A1A1A] hover:text-[#C89211] transition-colors py-1 px-2.5 rounded-lg hover:bg-[#F8F8F6]"
          >
            <ArrowLeft className="w-4 h-4 text-[#C89211]" />
            <span>Back to Team</span>
          </button>

          <button
            id="team-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-[#F8F8F6] hover:bg-[#E5E5E5] text-[#1A1A1A] flex items-center justify-center transition-colors border border-[#E5E5E5]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-8 max-h-[82vh] overflow-y-auto custom-scrollbar">
          {/* Header Profile Section */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start">
            {/* Profile Photo */}
            <div className="relative shrink-0 group">
              <div className="w-36 h-44 sm:w-44 sm:h-52 rounded-2xl overflow-hidden border-2 border-[#C89211]/40 shadow-md bg-stone-100">
                <img
                  src={member.photo}
                  alt={member.name}
                  loading="lazy"
                  className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    // Fallback to placeholder if broken
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80';
                  }}
                />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-[#C89211] to-amber-600 text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-md uppercase tracking-wider">
                Leadership
              </div>
            </div>

            {/* Profile Summary & Title */}
            <div className="flex-1 text-center sm:text-left space-y-3">
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight">
                  {member.name}
                </h2>
                <p className="text-[#C89211] font-medium text-sm sm:text-base mt-1">
                  {member.designation}
                </p>
              </div>

              {/* Key Badges (Experience & Specialization) */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                {member.experience && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30">
                    <Briefcase className="w-3.5 h-3.5 text-[#C89211]" />
                    <span>Experience: {member.experience}</span>
                  </div>
                )}
                {member.specialization && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F8F8F6] text-[#1A1A1A] border border-[#E5E5E5]">
                    <Award className="w-3.5 h-3.5 text-[#C89211]" />
                    <span>{member.specialization}</span>
                  </div>
                )}
              </div>

              {/* Short Bio Quote */}
              {member.shortBio && (
                <div className="pt-2 border-t border-[#E5E5E5]">
                  <p className="text-xs sm:text-sm text-[#666666] italic leading-relaxed">
                    "{member.shortBio}"
                  </p>
                </div>
              )}

              {/* Social / Contact Links */}
              {member.socialLinks && (
                <div className="flex items-center justify-center sm:justify-start gap-2.5 pt-2">
                  {member.socialLinks.linkedin && (
                    <a
                      href={member.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="LinkedIn"
                      className="w-8 h-8 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5] hover:bg-[#C89211] hover:text-white text-[#1A1A1A] flex items-center justify-center transition-colors"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                  {member.socialLinks.instagram && (
                    <a
                      href={member.socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Instagram"
                      className="w-8 h-8 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5] hover:bg-[#C89211] hover:text-white text-[#1A1A1A] flex items-center justify-center transition-colors"
                    >
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  {member.socialLinks.facebook && (
                    <a
                      href={member.socialLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Facebook"
                      className="w-8 h-8 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5] hover:bg-[#C89211] hover:text-white text-[#1A1A1A] flex items-center justify-center transition-colors"
                    >
                      <Facebook className="w-4 h-4" />
                    </a>
                  )}
                  {member.socialLinks.youtube && (
                    <a
                      href={member.socialLinks.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="YouTube"
                      className="w-8 h-8 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5] hover:bg-[#C89211] hover:text-white text-[#1A1A1A] flex items-center justify-center transition-colors"
                    >
                      <Youtube className="w-4 h-4" />
                    </a>
                  )}
                  {member.socialLinks.email && (
                    <a
                      href={`mailto:${member.socialLinks.email}`}
                      title={`Email ${member.name}`}
                      className="w-8 h-8 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5] hover:bg-[#C89211] hover:text-white text-[#1A1A1A] flex items-center justify-center transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Full Biography */}
          <div className="bg-[#F8F8F6] rounded-2xl p-5 sm:p-6 border border-[#E5E5E5] space-y-3">
            <h3 className="font-serif text-base sm:text-lg font-bold text-[#C89211] flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#C89211] rounded-full"></span>
              Biography & Background
            </h3>
            <p className="text-xs sm:text-sm text-[#1A1A1A] leading-relaxed whitespace-pre-line">
              {member.fullBio || member.shortBio || `Dedicated to delivering architectural excellence, authentic wood seasoning, and precision craftsmanship at ${settings?.businessName || 'Jai Hanuman Door'}.`}
            </p>
          </div>

          {/* Key Responsibilities & Achievements (2-column layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Responsibilities */}
            {member.responsibilities && member.responsibilities.length > 0 && (
              <div className="bg-[#F8F8F6] rounded-2xl p-5 border border-[#E5E5E5] space-y-3">
                <h4 className="text-xs uppercase tracking-wider font-bold text-[#C89211] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Key Responsibilities
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm text-[#666666]">
                  {member.responsibilities.map((resp, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C89211] mt-2 shrink-0"></span>
                      <span className="leading-snug text-[#1A1A1A]">{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Achievements */}
            {member.achievements && member.achievements.length > 0 && (
              <div className="bg-[#F8F8F6] rounded-2xl p-5 border border-[#E5E5E5] space-y-3">
                <h4 className="text-xs uppercase tracking-wider font-bold text-[#C89211] flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Key Milestones & Achievements
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm text-[#666666]">
                  {member.achievements.map((ach, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C89211] mt-2 shrink-0"></span>
                      <span className="leading-snug text-[#1A1A1A]">{ach}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Optional Video Link/Embed */}
          {member.videoUrl && (
            <div className="bg-[#F8F8F6] rounded-2xl p-5 border border-[#E5E5E5] space-y-3">
              <h4 className="text-xs uppercase tracking-wider font-bold text-[#C89211] flex items-center gap-2">
                <Play className="w-4 h-4" />
                Featured Video
              </h4>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5E5E5]">
                <span className="text-xs text-[#666666] truncate max-w-md">
                  Watch introduction or workshop craftsmanship walkthrough.
                </span>
                <a
                  href={member.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-lg bg-[#C89211] hover:bg-amber-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow transition-all shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play Video</span>
                </a>
              </div>
            </div>
          )}

          {/* Direct Consultation / Contact Bar */}
          <div className="pt-2 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-xs text-[#666666]">Have a custom architectural door requirement?</p>
              <p className="text-sm font-semibold text-[#1A1A1A]">Connect with our manufacturing team today.</p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Team</span>
              </a>

              {settings?.phone && (
                <a
                  href={`tel:${settings.phone}`}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#C89211] hover:bg-amber-600 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call Workshop</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
