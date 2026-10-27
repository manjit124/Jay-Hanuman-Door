import React from 'react';
import { Award, Sparkles, CheckCircle2 } from 'lucide-react';
import { TeamMember, BusinessSettings } from '../types.ts';
import { DEFAULT_STORY_SETTINGS } from './AdminBrandStoryTab.tsx';

interface OurStorySectionProps {
  teamMembers?: TeamMember[];
  settings?: BusinessSettings;
}

export const OurStorySection: React.FC<OurStorySectionProps> = ({ teamMembers, settings }) => {
  const story = settings?.storySettings;

  // Fallback to configured team member if present and not overridden in storySettings
  const ownerMember = teamMembers?.find(
    m =>
      m.name?.toLowerCase().includes('manjeet') ||
      m.designation?.toLowerCase().includes('founder') ||
      m.designation?.toLowerCase().includes('owner') ||
      (m as any).role?.toLowerCase().includes('founder') ||
      (m as any).role?.toLowerCase().includes('owner')
  );

  const sectionTitle = story?.sectionTitle || DEFAULT_STORY_SETTINGS.sectionTitle!;
  const subtitle = story?.subtitle || DEFAULT_STORY_SETTINGS.subtitle!;
  const storyHeading = story?.storyHeading || DEFAULT_STORY_SETTINGS.storyHeading!;
  const companyStory = story?.companyStory || DEFAULT_STORY_SETTINGS.companyStory!;

  const defaultOwnerUnsplash = DEFAULT_STORY_SETTINGS.ownerPhotoUrl!;
  const storyPhoto = story?.ownerPhotoUrl?.trim();
  const memberPhoto = (ownerMember?.photo || (ownerMember as any)?.imageUrl || '').trim();

  // If storyPhoto iscustomized (or memberPhoto is not customized), use storyPhoto; if storyPhoto is still default Unsplash while memberPhoto was customized in Team tab, prefer memberPhoto
  const resolvedOwnerPhoto =
    storyPhoto && storyPhoto !== defaultOwnerUnsplash
      ? storyPhoto
      : memberPhoto && memberPhoto !== defaultOwnerUnsplash
      ? memberPhoto
      : storyPhoto || memberPhoto || defaultOwnerUnsplash;

  const ownerName = story?.ownerName || ownerMember?.name || DEFAULT_STORY_SETTINGS.ownerName!;
  const ownerRole = story?.ownerDesignation || ownerMember?.designation || (ownerMember as any)?.role || DEFAULT_STORY_SETTINGS.ownerDesignation!;
  const ownerPhoto = resolvedOwnerPhoto;
  const ownerBio = story?.ownerDescription || ownerMember?.shortBio || (ownerMember as any)?.bio || DEFAULT_STORY_SETTINGS.ownerDescription!;

  const highlights = story?.highlights && story.highlights.length === 3
    ? story.highlights
    : DEFAULT_STORY_SETTINGS.highlights!;

  // Split story into paragraphs by double newlines or single newlines
  const paragraphs = companyStory
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return (
    <section
      id="our-story-heritage-section"
      aria-label="Our Story & Heritage"
      className="py-8 sm:py-12 bg-white text-[#1A1A1A] border-y border-[#EAEAEA]"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left">
        
        {/* Top Header Badge & Title */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30 tracking-wider uppercase mb-2.5">
            <Award className="w-3.5 h-3.5 text-[#C89211]" />
            <span>OUR STORY</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1A1A1A] tracking-tight">
            {sectionTitle}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-[#777777] mt-1 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        {/* Company History Content Card / Paragraphs */}
        <div className="bg-[#FAF9F5] border border-[#EBE8DF] rounded-2xl p-5 sm:p-7 mb-6 sm:mb-8 shadow-xs">
          {storyHeading && (
            <h3 className="font-serif text-base sm:text-lg font-bold text-[#1A1A1A] mb-3 text-center sm:text-left text-[#C89211]">
              {storyHeading}
            </h3>
          )}
          
          <div className="space-y-3 text-xs sm:text-sm text-[#444444] leading-relaxed">
            {paragraphs.length > 0 ? (
              paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))
            ) : (
              <p className="whitespace-pre-line">{companyStory}</p>
            )}
          </div>

          {/* Quick Pillars / Highlights */}
          {highlights && highlights.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-5 pt-4 border-t border-[#EAE6DA] text-center">
              {highlights.map((h, i) => (
                <div key={i} className={`p-2 ${i === 1 ? 'border-x border-[#EAE6DA]' : ''}`}>
                  <div className="text-[#C89211] font-bold text-xs sm:text-sm">{h.title}</div>
                  <div className="text-[10px] sm:text-xs text-[#777777]">{h.subtitle}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Founder / Owner Profile */}
        <div className="bg-white border border-[#E8E8E8] rounded-2xl p-4 sm:p-6 shadow-xs">
          <div className="text-center mb-3">
            <span className="text-[11px] font-bold text-[#C89211] uppercase tracking-wider">
              Meet the Owner
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left max-w-xl mx-auto">
            {/* Owner Photo with Subtle Gold Ring */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-[82px] sm:h-[82px] rounded-full p-1 bg-gradient-to-tr from-[#C89211] via-[#E2B755] to-[#FFF7E3] shadow-sm">
                <img
                  src={ownerPhoto}
                  alt={ownerName}
                  className="w-full h-full object-cover rounded-full bg-[#FAF9F5]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_STORY_SETTINGS.ownerPhotoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80';
                  }}
                />
              </div>
            </div>

            {/* Owner Details */}
            <div className="flex-1 min-w-0">
              <h4 className="font-serif text-base sm:text-lg font-bold text-[#1A1A1A] leading-tight">
                {ownerName}
              </h4>
              <p className="text-xs text-[#C89211] font-semibold mt-0.5">
                {ownerRole}
              </p>
              {ownerBio && (
                <p className="text-xs text-[#555555] leading-relaxed mt-2 whitespace-pre-line">
                  {ownerBio}
                </p>
              )}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
