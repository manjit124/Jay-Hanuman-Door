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
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="team-detail-modal-card"
        className="relative w-full max-w-3xl bg-stone-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden text-stone-100 my-8 transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar with Back button and Close button */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-stone-800 bg-stone-950/60 sticky top-0 z-10">
          <button
            id="team-modal-back-btn"
            onClick={onClose}
            className="flex items-center gap-2 text-xs sm:text-sm font-medium text-stone-300 hover:text-amber-400 transition-colors py-1 px-2.5 rounded-lg hover:bg-stone-800/60"
          >
            <ArrowLeft className="w-4 h-4 text-amber-500" />
            <span>Back to Team</span>
          </button>

          <button
            id="team-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors"
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
              <div className="w-36 h-44 sm:w-44 sm:h-52 rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-xl bg-stone-800">
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
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-md uppercase tracking-wider">
                Leadership
              </div>
            </div>

            {/* Profile Summary & Title */}
            <div className="flex-1 text-center sm:text-left space-y-3">
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-stone-100 tracking-tight">
                  {member.name}
                </h2>
                <p className="text-amber-400 font-medium text-sm sm:text-base mt-1">
                  {member.designation}
                </p>
              </div>

              {/* Key Badges (Experience & Specialization) */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                {member.experience && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                    <span>Experience: {member.experience}</span>
                  </div>
                )}
                {member.specialization && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-800 text-stone-200 border border-stone-700">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>{member.specialization}</span>
                  </div>
                )}
              </div>

              {/* Short Bio Quote */}
              {member.shortBio && (
                <div className="pt-2 border-t border-stone-800/80">
                  <p className="text-xs sm:text-sm text-stone-300 italic leading-relaxed">
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
                      className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-stone-300 flex items-center justify-center transition-colors"
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
                      className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-stone-300 flex items-center justify-center transition-colors"
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
                      className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-stone-300 flex items-center justify-center transition-colors"
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
                      className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-stone-300 flex items-center justify-center transition-colors"
                    >
                      <Youtube className="w-4 h-4" />
                    </a>
                  )}
                  {member.socialLinks.email && (
                    <a
                      href={`mailto:${member.socialLinks.email}`}
                      title={`Email ${member.name}`}
                      className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-stone-300 flex items-center justify-center transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Full Biography */}
          <div className="bg-stone-950/60 rounded-2xl p-5 sm:p-6 border border-stone-800/80 space-y-3">
            <h3 className="font-serif text-base sm:text-lg font-bold text-amber-400 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full"></span>
              Biography & Background
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed whitespace-pre-line">
              {member.fullBio || member.shortBio || `Dedicated to delivering architectural excellence, authentic wood seasoning, and precision craftsmanship at ${settings?.businessName || 'Jai Hanuman Door'}.`}
            </p>
          </div>

          {/* Key Responsibilities & Achievements (2-column layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Responsibilities */}
            {member.responsibilities && member.responsibilities.length > 0 && (
              <div className="bg-stone-950/40 rounded-2xl p-5 border border-stone-800/80 space-y-3">
                <h4 className="text-xs uppercase tracking-wider font-bold text-amber-500 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Key Responsibilities
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm text-stone-300">
                  {member.responsibilities.map((resp, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0"></span>
                      <span className="leading-snug">{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Achievements */}
            {member.achievements && member.achievements.length > 0 && (
              <div className="bg-stone-950/40 rounded-2xl p-5 border border-stone-800/80 space-y-3">
                <h4 className="text-xs uppercase tracking-wider font-bold text-amber-500 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Key Milestones & Achievements
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm text-stone-300">
                  {member.achievements.map((ach, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0"></span>
                      <span className="leading-snug">{ach}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Optional Video Link/Embed (Requirement 22) */}
          {member.videoUrl && (
            <div className="bg-stone-950/60 rounded-2xl p-5 border border-stone-800 space-y-3">
              <h4 className="text-xs uppercase tracking-wider font-bold text-amber-400 flex items-center gap-2">
                <Play className="w-4 h-4" />
                Featured Video
              </h4>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-900/80 p-4 rounded-xl border border-stone-800">
                <span className="text-xs text-stone-300 truncate max-w-md">
                  Watch introduction or workshop craftsmanship walkthrough.
                </span>
                <a
                  href={member.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-xs flex items-center gap-1.5 shadow transition-all shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play Video</span>
                </a>
              </div>
            </div>
          )}

          {/* Direct Consultation / Contact Bar */}
          <div className="pt-2 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-xs text-stone-400">Have a custom architectural door requirement?</p>
              <p className="text-sm font-semibold text-stone-200">Connect with our manufacturing team today.</p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Team</span>
              </a>

              {settings?.phone && (
                <a
                  href={`tel:${settings.phone}`}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
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
