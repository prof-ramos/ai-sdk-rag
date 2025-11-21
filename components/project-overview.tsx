import React from "react";
import { motion } from "framer-motion";
import { InformationIcon } from "./icons";

const ProjectOverview = () => {
  return (
    <motion.div
      className="w-full max-w-[600px] my-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
    >
      <div className="border-2 border-institutional-accent/30 rounded-xl p-6 flex flex-col gap-4 text-sm bg-gradient-to-br from-white to-institutional-neutral dark:from-institutional-secondary dark:to-institutional-primary shadow-xl backdrop-blur-sm">
        <div className="flex flex-row justify-center items-center gap-3">
          <div className="text-3xl">🇧🇷</div>
          <h1 className="text-2xl font-bold bg-gradient-institutional bg-clip-text text-transparent">
            ChatBot para Oficiais de Chancelaria
          </h1>
        </div>

        <div className="border-t border-institutional-accent/30 pt-4">
          <p className="text-institutional-primary dark:text-institutional-neutral leading-relaxed">
            Bem-vindo ao assistente inteligente especializado para{" "}
            <strong className="text-institutional-secondary dark:text-institutional-accent">Oficiais de Chancelaria</strong> do Serviço Exterior Brasileiro.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-institutional-accent/5 dark:bg-institutional-accent/10 p-3 rounded-lg border border-institutional-accent/20">
            <InformationIcon size={18} className="mt-0.5 flex-shrink-0 text-institutional-accent" />
            <p className="text-xs text-institutional-primary dark:text-institutional-neutral">
              <strong className="text-institutional-secondary dark:text-institutional-accent">RAG Otimizado:</strong> Consulta legislações e documentos oficiais com busca semântica avançada
            </p>
          </div>

          <div className="flex items-start gap-3 bg-institutional-accent/5 dark:bg-institutional-accent/10 p-3 rounded-lg border border-institutional-accent/20">
            <InformationIcon size={18} className="mt-0.5 flex-shrink-0 text-institutional-accent" />
            <p className="text-xs text-institutional-primary dark:text-institutional-neutral">
              <strong className="text-institutional-secondary dark:text-institutional-accent">IA Avançada:</strong> Powered by Google Gemini 2.5 com Thinking Mode para análises complexas
            </p>
          </div>

          <div className="flex items-start gap-3 bg-institutional-accent/5 dark:bg-institutional-accent/10 p-3 rounded-lg border border-institutional-accent/20">
            <InformationIcon size={18} className="mt-0.5 flex-shrink-0 text-institutional-accent" />
            <p className="text-xs text-institutional-primary dark:text-institutional-neutral">
              <strong className="text-institutional-secondary dark:text-institutional-accent">Portal da Transparência:</strong> Consulta integrada de gastos, contratos e viagens do MRE
            </p>
          </div>
        </div>

        <div className="border-t border-institutional-accent/30 pt-3">
          <p className="text-xs text-center text-institutional-secondary dark:text-institutional-accent font-medium">
            Faça perguntas sobre legislação, atribuições, procedimentos ou consulte dados do Portal da Transparência
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectOverview;
