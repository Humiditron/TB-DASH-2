import React from 'react';
import {
  X,
  ExternalLink,
  ShieldCheck,
  Server,
  MessageSquare,
  Lock,
  LayoutDashboard,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Layers,
  ArrowUpRight,
  Radio,
} from 'lucide-react';
import { APP_CONFIG } from '../config/env';

interface EcosystemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EcosystemModal: React.FC<EcosystemModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const { domains } = APP_CONFIG;

  const SERVICES = [
    {
      id: 'dashboard',
      name: 'HUMID1 Customer Dashboard',
      domain: 'dash.humid1.com',
      url: domains.dashboardUrl,
      port: 'Port 5000 / 80',
      role: 'Hardware Telemetry, Visual Gauges, Firmware OTA & Claiming',
      description: 'The primary user interface for monitoring cigar humidor climate, logs, and settings.',
      icon: LayoutDashboard,
      badge: 'Current App',
      badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      isExternal: false,
    },
    {
      id: 'thingsboard',
      name: 'ThingsBoard IoT Core',
      domain: 'app.humid1.com',
      url: domains.thingsboardUrl,
      port: 'Port 8080',
      role: 'Telemetry Engine, Shared Attributes & Device Claiming API',
      description: 'Backend IoT engine collecting data from ESP32 microcontrollers and executing RPC commands.',
      icon: Server,
      badge: 'Backend Core',
      badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      isExternal: true,
    },
    {
      id: 'authentik',
      name: 'Authentik Identity Provider',
      domain: 'auth.humid1.com',
      url: `${domains.authentikUrl}/application/o/web-dash/`,
      port: 'Port 9000 (slug: web-dash)',
      role: 'Single Sign-On (SSO), OAuth2, Passkeys & User Directory',
      description: 'Centralized authentication service verifying customer identities securely for the web dashboard.',
      icon: ShieldCheck,
      badge: 'SSO Auth',
      badgeColor: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      isExternal: true,
    },
    {
      id: 'chat',
      name: 'Chatto Live Concierge',
      domain: 'chat.humid1.com',
      url: domains.chatUrl,
      port: 'Port 4000',
      role: 'Live Technical Support, Concierge & Community Messaging',
      description: 'Need help? Connect directly with the HUMID1 engineering and support team.',
      icon: MessageSquare,
      badge: 'Live Support',
      badgeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      isExternal: true,
    },
    {
      id: 'captcha',
      name: 'Cap Captcha Guard',
      domain: 'cap.humid1.com',
      url: domains.captchaUrl,
      port: 'Port 3000',
      role: 'Bot Protection & Rate Limiting Verification',
      description: 'Protects login endpoints and hardware provisioning API against automated abuse.',
      icon: Lock,
      badge: 'Security Guard',
      badgeColor: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      isExternal: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl p-6 sm:p-7 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/30 text-amber-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-lg">HUMID1 Ecosystem & Domain Map</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Connected microservices and host routing directory
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* White-glove description */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-200">White-Glove Architecture: </span>
            All subdomains, tokens, and endpoints are automatically aggregated from the environment configuration. You do not need to configure complex IP addresses or ports manually.
          </div>
        </div>

        {/* Service Cards Grid */}
        <div className="space-y-3">
          {SERVICES.map((srv) => {
            const Icon = srv.icon;
            return (
              <div
                key={srv.id}
                className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200 text-sm">{srv.name}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${srv.badgeColor}`}>
                          {srv.badge}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-amber-400/90 flex items-center gap-2">
                        <span>{srv.domain}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-400">{srv.port}</span>
                      </div>
                    </div>
                  </div>

                  {srv.isExternal && (
                    <a
                      href={srv.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
                    >
                      <span>Open Service</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  )}
                </div>

                <p className="text-xs text-slate-400 pl-1">
                  {srv.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Live Support Concierge Callout */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-purple-950/40 border border-purple-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Questions or Need Onboarding Help?</h4>
              <p className="text-[11px] text-slate-400">Our team is available 24/7 on the Chatto support channel.</p>
            </div>
          </div>

          <a
            href={domains.chatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Launch Chatto Support</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
