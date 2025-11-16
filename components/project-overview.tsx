import React from "react";
import { motion } from "framer-motion";
import { InformationIcon } from "./icons";

const ProjectOverview = () => {
  return (
    <motion.div
      className="w-full max-w-[600px] my-4"
      initial={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 5 }}
    >
      <div className="border rounded-lg p-6 flex flex-col gap-4 text-neutral-500 text-sm dark:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex flex-row justify-center items-center gap-3">
          <div className="text-2xl">🇧🇷</div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            ChatBot para Oficiais de Chancelaria
          </h1>
        </div>

        <div className="border-t border-neutral-300 dark:border-neutral-700 pt-4">
          <p className="text-neutral-700 dark:text-neutral-300">
            Bem-vindo ao assistente inteligente especializado para{" "}
            <strong>Oficiais de Chancelaria</strong> do Serviço Exterior Brasileiro.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <InformationIcon size={16} className="mt-1 flex-shrink-0" />
            <p className="text-xs">
              <strong>RAG Otimizado:</strong> Consulta legislações e documentos oficiais com busca semântica avançada
            </p>
          </div>

          <div className="flex items-start gap-2">
            <InformationIcon size={16} className="mt-1 flex-shrink-0" />
            <p className="text-xs">
              <strong>IA Avançada:</strong> Powered by Google Gemini 2.5 com Thinking Mode para análises complexas
            </p>
          </div>

          <div className="flex items-start gap-2">
            <InformationIcon size={16} className="mt-1 flex-shrink-0" />
            <p className="text-xs">
              <strong>Portal da Transparência:</strong> Consulta integrada de gastos, contratos e viagens do MRE
            </p>
          </div>
        </div>

        <div className="border-t border-neutral-300 dark:border-neutral-700 pt-3">
          <p className="text-xs text-center text-neutral-500 dark:text-neutral-400">
            Faça perguntas sobre legislação, atribuições, procedimentos ou consulte dados do Portal da Transparência
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectOverview;
