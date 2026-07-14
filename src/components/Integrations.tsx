import { motion } from "framer-motion";
import { MessageSquare, Terminal, MessageCircle, Cpu } from "lucide-react";

interface IntegrationItem {
  name: string;
  icon: React.ReactNode;
  accentClass: string;
}

const INTEGRATIONS: IntegrationItem[] = [
  {
    name: "Telegram",
    icon: <MessageCircle className="w-4 h-4" />,
    accentClass: "group-hover:text-[#0088cc] group-hover:border-[#0088cc]/20 group-hover:bg-[#0088cc]/5",
  },
  {
    name: "Discord",
    icon: <MessageSquare className="w-4 h-4" />,
    accentClass: "group-hover:text-[#5865F2] group-hover:border-[#5865F2]/20 group-hover:bg-[#5865F2]/5",
  },
  {
    name: "WhatsApp",
    icon: <MessageCircle className="w-4 h-4" />,
    accentClass: "group-hover:text-[#25D366] group-hover:border-[#25D366]/20 group-hover:bg-[#25D366]/5",
  },
  {
    name: "CLI Console",
    icon: <Terminal className="w-4 h-4" />,
    accentClass: "group-hover:text-charcoal group-hover:border-charcoal/20 group-hover:bg-charcoal/5",
  },
  {
    name: "lazyclip Agent",
    icon: <Cpu className="w-4 h-4" />,
    accentClass: "group-hover:text-electricBlue group-hover:border-electricBlue/20 group-hover:bg-electricBlue/5",
  },
];

export default function Integrations() {
  return (
    <section className="w-full py-10 px-6 md:px-12 max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 border-y border-[#E5E5E2]/60 bg-white/40 backdrop-blur-sm rounded-3xl mt-6 mb-12">
      
      {/* Title */}
      <div className="flex flex-col gap-1 max-w-xs text-center md:text-left">
        <span className="font-mono text-[9px] uppercase tracking-wider text-secondaryText">
          APIs & Bots
        </span>
        <h3 className="font-display font-bold text-lg text-charcoal">
          Works inside your stack.
        </h3>
        <p className="font-sans text-xs text-secondaryText">
          No custom clients required. Just message your media to our bots.
        </p>
      </div>

      {/* Integration Badges */}
      <div className="flex flex-wrap justify-center gap-3">
        {INTEGRATIONS.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
            className={`group flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-[#E5E5E2] bg-white text-xs font-mono text-secondaryText cursor-default transition-all duration-300 hover:shadow-sm hover:scale-105 hover-trigger ${item.accentClass}`}
            data-cursor-text={item.name}
          >
            {item.icon}
            <span className="font-bold text-charcoal group-hover:text-inherit transition-colors">
              {item.name}
            </span>
          </motion.div>
        ))}
      </div>

    </section>
  );
}
