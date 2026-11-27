import React from 'react';
import type { WindowIllustrationType } from '../../types.ts';

interface WindowSystemIllustrationProps {
  type: WindowIllustrationType;
  className?: string;
}

/**
 * Clean architectural technical SVG illustrations for Indian Aluminium Window Systems.
 * Uses WindowCut Pro navy (#0A2540), engineering blue (#0B5ED7), glass sky tint (#E0F2FE),
 * and subtle orange (#F97316) track/direction indicators.
 */
export const WindowSystemIllustration: React.FC<WindowSystemIllustrationProps> = ({
  type,
  className = 'w-full h-24',
}) => {
  const renderSliding = (panels: number, hasMesh: boolean, label?: string, heavy = false) => {
    const frameStroke = heavy ? 4.5 : 3;
    const innerX = 18;
    const innerY = 14;
    const innerW = 124;
    const innerH = 66;
    const panelW = innerW / panels;

    return (
      <>
        {/* Outer aluminium frame */}
        <rect
          x={innerX - 4}
          y={innerY - 4}
          width={innerW + 8}
          height={innerH + 8}
          rx={2.5}
          fill="#F8FAFC"
          stroke="#0A2540"
          strokeWidth={frameStroke}
        />
        {/* Track indicator lines at bottom */}
        {Array.from({ length: Math.min(4, Math.max(2, panels)) }).map((_, idx) => (
          <line
            key={`trk-${idx}`}
            x1={innerX - 2}
            y1={innerY + innerH + 6 + idx * 2.2}
            x2={innerX + innerW + 2}
            y2={innerY + innerH + 6 + idx * 2.2}
            stroke={idx === 0 ? '#F97316' : '#94A3B8'}
            strokeWidth={1.3}
          />
        ))}
        {/* Shutters */}
        {Array.from({ length: panels }).map((_, i) => {
          const x = innerX + i * panelW;
          const isMeshPanel = hasMesh && i === panels - 1;
          return (
            <g key={`p-${i}`}>
              <rect
                x={x + 1.5}
                y={innerY + 1.5}
                width={panelW - 3}
                height={innerH - 3}
                fill={isMeshPanel ? '#FFF7ED' : '#E0F2FE'}
                stroke="#0B5ED7"
                strokeWidth={heavy ? 2.2 : 1.6}
              />
              {isMeshPanel ? (
                <>
                  {/* Crosshatch mesh lines */}
                  {Array.from({ length: 5 }).map((__, m) => (
                    <line
                      key={`mh-${m}`}
                      x1={x + 3}
                      y1={innerY + 11 + m * 11}
                      x2={x + panelW - 3}
                      y2={innerY + 11 + m * 11}
                      stroke="#F97316"
                      strokeOpacity={0.45}
                      strokeWidth={0.9}
                    />
                  ))}
                  {Array.from({ length: 3 }).map((__, m) => (
                    <line
                      key={`mv-${m}`}
                      x1={x + (panelW / 4) * (m + 1)}
                      y1={innerY + 3}
                      x2={x + (panelW / 4) * (m + 1)}
                      y2={innerY + innerH - 3}
                      stroke="#F97316"
                      strokeOpacity={0.45}
                      strokeWidth={0.9}
                    />
                  ))}
                </>
              ) : (
                <>
                  {/* Glass reflection lines */}
                  <line
                    x1={x + 7}
                    y1={innerY + 14}
                    x2={x + Math.min(panelW - 7, 17)}
                    y2={innerY + 6}
                    stroke="#FFFFFF"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                  />
                  {/* Slide direction arrow */}
                  <path
                    d={
                      i % 2 === 0
                        ? `M ${x + panelW / 2 - 5} ${innerY + innerH / 2} L ${x + panelW / 2 + 5} ${innerY + innerH / 2} M ${x + panelW / 2 + 2} ${innerY + innerH / 2 - 3} L ${x + panelW / 2 + 5} ${innerY + innerH / 2} L ${x + panelW / 2 + 2} ${innerY + innerH / 2 + 3}`
                        : `M ${x + panelW / 2 + 5} ${innerY + innerH / 2} L ${x + panelW / 2 - 5} ${innerY + innerH / 2} M ${x + panelW / 2 - 2} ${innerY + innerH / 2 - 3} L ${x + panelW / 2 - 5} ${innerY + innerH / 2} L ${x + panelW / 2 - 2} ${innerY + innerH / 2 + 3}`
                    }
                    stroke="#0A2540"
                    strokeWidth={1.4}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}
              {/* Handle tick */}
              <rect
                x={i === 0 ? x + 4 : x + panelW - 6}
                y={innerY + innerH / 2 - 7}
                width={2}
                height={14}
                rx={1}
                fill="#0A2540"
              />
            </g>
          );
        })}
        {label && (
          <text
            x={80}
            y={10.5}
            textAnchor="middle"
            fontSize="7.5"
            fontWeight="700"
            fill="#0B5ED7"
            fontFamily="monospace"
          >
            {label}
          </text>
        )}
      </>
    );
  };

  const renderContent = () => {
    switch (type) {
      case '2-track':
        return renderSliding(2, false, '2 TRACK');
      case '3-track':
        return renderSliding(3, true, '3 TRACK + NET');
      case '4-track':
        return renderSliding(4, true, '4 TRACK');
      case '18-50':
        return renderSliding(2, false, '18/50 SERIES', true);
      case 'heavy-sliding':
        return renderSliding(3, false, 'HEAVY SERIES', true);
      case 'dhumal':
        return (
          <>
            {/* Architectural Dhumal Heavy Frame Profile */}
            <rect x={12} y={12} width={136} height={74} rx={3} fill="#EFF6FF" stroke="#0A2540" strokeWidth={4} />
            <rect x={18} y={18} width={124} height={62} fill="#FFFFFF" stroke="#0B5ED7" strokeWidth={1.5} />
            <rect x={21} y={21} width={57} height={56} fill="#E0F2FE" stroke="#0A2540" strokeWidth={2.2} />
            <rect x={82} y={21} width={57} height={56} fill="#E0F2FE" stroke="#0A2540" strokeWidth={2.2} />
            {/* Interlock center emphasis */}
            <rect x={77.5} y={19} width={5} height={60} fill="#F97316" rx={1} />
            <path d="M 42 49 L 56 49 M 52 46 L 56 49 L 52 52" stroke="#0A2540" strokeWidth={1.5} fill="none" strokeLinecap="round" />
            <path d="M 118 49 L 104 49 M 108 46 L 104 49 L 108 52" stroke="#0A2540" strokeWidth={1.5} fill="none" strokeLinecap="round" />
            <text x={80} y={9.5} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#F97316" fontFamily="monospace">
              DHUMAL SERIES
            </text>
          </>
        );
      case 'indian-standard':
        return renderSliding(2, false, 'IND STANDARD');
      case 'aluminium-section':
        return (
          <>
            <rect x={16} y={13} width={128} height={72} rx={2} fill="#F8FAFC" stroke="#0A2540" strokeWidth={3.5} />
            <rect x={22} y={19} width={55} height={60} fill="#E0F2FE" stroke="#0B5ED7" strokeWidth={2} />
            <rect x={83} y={19} width={55} height={60} fill="#E0F2FE" stroke="#0B5ED7" strokeWidth={2} />
            {/* Cross-section corner detail badge */}
            <rect x={67} y={37} width={26} height={24} rx={2} fill="#FFFFFF" stroke="#F97316" strokeWidth={1.8} />
            <path d="M 73 43 H 87 V 55 H 82 V 48 H 73 Z" fill="#0A2540" />
            <text x={80} y={10} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#0B5ED7" fontFamily="monospace">
              ALU SECTION
            </text>
          </>
        );
      case 'local-fabrication':
        return (
          <>
            <rect x={16} y={14} width={128} height={70} rx={2} fill="#F8FAFC" stroke="#0A2540" strokeWidth={3} />
            <rect x={22} y={20} width={37} height={58} fill="#E0F2FE" stroke="#0B5ED7" strokeWidth={1.6} />
            <rect x={61.5} y={20} width={37} height={58} fill="#E0F2FE" stroke="#0B5ED7" strokeWidth={1.6} />
            <rect x={101} y={20} width={37} height={58} fill="#E0F2FE" stroke="#0B5ED7" strokeWidth={1.6} />
            <line x1={16} y1={91} x2={144} y2={91} stroke="#F97316" strokeWidth={1.5} strokeDasharray="3 2" />
            <text x={80} y={10.5} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#0A2540" fontFamily="monospace">
              LOCAL FAB
            </text>
          </>
        );
      case 'custom-profile':
        return (
          <>
            <rect x={16} y={14} width={128} height={70} rx={2} fill="#F8FAFC" stroke="#0B5ED7" strokeWidth={2.5} strokeDasharray="5 2.5" />
            <rect x={24} y={22} width={52} height={54} fill="#EFF6FF" stroke="#0A2540" strokeWidth={1.8} />
            <rect x={84} y={22} width={52} height={54} fill="#EFF6FF" stroke="#0A2540" strokeWidth={1.8} />
            {/* Dimension arrows */}
            <path d="M 24 89 H 136 M 24 86 V 92 M 136 86 V 92" stroke="#F97316" strokeWidth={1.4} />
            <text x={80} y={10.5} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#F97316" fontFamily="monospace">
              CUSTOM PROFILE
            </text>
          </>
        );
      case 'fixed-glass':
        return (
          <>
            <rect x={20} y={14} width={120} height={72} rx={2} fill="#F8FAFC" stroke="#0A2540" strokeWidth={3.5} />
            <rect x={27} y={21} width={106} height={58} fill="#E0F2FE" stroke="#0B5ED7" strokeWidth={1.8} />
            {/* Fixed glass diagonal shimmer & center cross mark */}
            <line x1={38} y1={42} x2={58} y2={26} stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" />
            <line x1={46} y1={52} x2={72} y2={30} stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" />
            <path d="M 75 45 L 85 55 M 85 45 L 75 55" stroke="#0B5ED7" strokeWidth={1.6} strokeOpacity={0.5} />
            <text x={80} y={10.5} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#0B5ED7" fontFamily="monospace">
              FIXED GLASS
            </text>
          </>
        );
      case 'openable':
        return (
          <>
            <rect x={18} y={14} width={124} height={72} rx={2} fill="#F8FAFC" stroke="#0A2540" strokeWidth={3.2} />
            {/* Left casement */}
            <rect x={23} y={19} width={55} height={62} fill="#E0F2FE" stroke="#0B5ED7" strokeWidth={1.8} />
            <path d="M 23 19 L 78 50 L 23 81" stroke="#F97316" strokeWidth={1.3} strokeDasharray="3 2.5" fill="none" />
            {/* Right casement */}
            <rect x={82} y={19} width={55} height={62} fill="#E0F2FE" stroke="#0B5ED7" strokeWidth={1.8} />
            <path d="M 137 19 L 82 50 L 137 81" stroke="#F97316" strokeWidth={1.3} strokeDasharray="3 2.5" fill="none" />
            {/* Handles */}
            <rect x={73} y={45} width={2.5} height={11} rx={1} fill="#0A2540" />
            <rect x={84.5} y={45} width={2.5} height={11} rx={1} fill="#0A2540" />
            <text x={80} y={10.5} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#0B5ED7" fontFamily="monospace">
              OPENABLE
            </text>
          </>
        );
      case 'combination':
        return (
          <>
            <rect x={14} y={14} width={132} height={72} rx={2} fill="#F8FAFC" stroke="#0A2540" strokeWidth={3.2} />
            {/* Top fixed transom */}
            <rect x={19} y={19} width={122} height={20} fill="#DBEAFE" stroke="#0B5ED7" strokeWidth={1.5} />
            {/* Bottom 2 sliding sashes */}
            <rect x={19} y={42} width={60} height={39} fill="#E0F2FE" stroke="#0B5ED7" strokeWidth={1.6} />
            <rect x={81} y={42} width={60} height={39} fill="#E0F2FE" stroke="#0B5ED7" strokeWidth={1.6} />
            <path d="M 43 61 H 55 M 52 58 L 55 61 L 52 64" stroke="#F97316" strokeWidth={1.5} fill="none" />
            <path d="M 117 61 H 105 M 108 58 L 105 61 L 108 64" stroke="#F97316" strokeWidth={1.5} fill="none" />
            <text x={80} y={10.5} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#0B5ED7" fontFamily="monospace">
              COMBINATION
            </text>
          </>
        );
      case 'ventilator':
        return (
          <>
            <rect x={24} y={18} width={112} height={64} rx={2} fill="#F8FAFC" stroke="#0A2540" strokeWidth={3.2} />
            {/* Louver slats on left */}
            <rect x={29} y={23} width={54} height={54} fill="#E0F2FE" stroke="#0B5ED7" strokeWidth={1.6} />
            {[33, 43, 53, 63, 72].map((ly) => (
              <line key={ly} x1={32} y1={ly} x2={80} y2={ly - 4} stroke="#0A2540" strokeWidth={1.5} />
            ))}
            {/* Exhaust fan cutout on right */}
            <rect x={86} y={23} width={45} height={54} fill="#EFF6FF" stroke="#0B5ED7" strokeWidth={1.6} />
            <circle cx={108.5} cy={50} r={14} fill="#FFFFFF" stroke="#F97316" strokeWidth={1.8} />
            <circle cx={108.5} cy={50} r={3.5} fill="#0A2540" />
            <text x={80} y={13} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#0B5ED7" fontFamily="monospace">
              VENTILATOR
            </text>
          </>
        );
      case 'mosquito-net':
        return (
          <>
            <rect x={20} y={14} width={120} height={72} rx={2} fill="#FFF7ED" stroke="#0A2540" strokeWidth={3.2} />
            <rect x={26} y={20} width={108} height={60} fill="#FFFFFF" stroke="#F97316" strokeWidth={1.8} />
            {/* Fine mosquito mesh grid */}
            {[30, 40, 50, 60, 70].map((yPos) => (
              <line key={`hy-${yPos}`} x1={27} y1={yPos} x2={133} y2={yPos} stroke="#F97316" strokeOpacity={0.45} strokeWidth={1} />
            ))}
            {[40, 54, 68, 82, 96, 110, 124].map((xPos) => (
              <line key={`vx-${xPos}`} x1={xPos} y1={21} x2={xPos} y2={79} stroke="#F97316" strokeOpacity={0.45} strokeWidth={1} />
            ))}
            <text x={80} y={10.5} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#F97316" fontFamily="monospace">
              MOSQUITO NET
            </text>
          </>
        );
      default:
        return renderSliding(2, false, 'WINDOW');
    }
  };

  return (
    <svg
      viewBox="0 0 160 96"
      className={className}
      role="img"
      aria-label={`${type} aluminium window schematic`}
    >
      {renderContent()}
    </svg>
  );
};
