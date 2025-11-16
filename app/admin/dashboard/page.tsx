"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Tab = "prompt" | "rag" | "logs" | "settings";

interface Resource {
  id: string;
  content: string;
  createdAt: string;
  embeddingCount: number;
}

interface ChatLog {
  id: string;
  userId: string | null;
  question: string;
  answer: string;
  model: string | null;
  createdAt: string;
}

interface Settings {
  system_prompt?: string;
  model_name?: string;
  thinking_enabled?: string;
  thinking_budget?: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("prompt");
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();

  // Settings state
  const [settings, setSettings] = useState<Settings>({});
  const [systemPrompt, setSystemPrompt] = useState("");
  const [modelName, setModelName] = useState("");
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [thinkingBudget, setThinkingBudget] = useState("8192");

  // RAG state
  const [resources, setResources] = useState<Resource[]>([]);
  const [newResourceContent, setNewResourceContent] = useState("");
  const [newResourceTitle, setNewResourceTitle] = useState("");
  const [newResourceType, setNewResourceType] = useState("");
  const [newResourceUrl, setNewResourceUrl] = useState("");

  // Logs state
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  // Loading states
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [savingModel, setSavingModel] = useState(false);
  const [savingThinking, setSavingThinking] = useState(false);
  const [addingResource, setAddingResource] = useState(false);
  const [deletingResource, setDeletingResource] = useState<string | null>(null);
  const [exportingLogs, setExportingLogs] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/admin/session");
      const data = await res.json();

      if (!data.authenticated) {
        router.push("/admin");
        return;
      }

      setAuthenticated(true);
      loadSettings();
      loadResources();
      loadLogs();
    } catch (err) {
      router.push("/admin");
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      setSettings(data.settings || {});
      setSystemPrompt(data.settings?.system_prompt || "");
      setModelName(data.settings?.model_name || "openai/gpt-4o");
      setThinkingEnabled(data.settings?.thinking_enabled === "true");
      setThinkingBudget(data.settings?.thinking_budget || "8192");
    } catch (err) {
      console.error("Error loading settings:", err);
    }
  };

  const loadResources = async () => {
    try {
      const res = await fetch("/api/admin/resources");
      const data = await res.json();
      setResources(data.resources || []);
    } catch (err) {
      console.error("Error loading resources:", err);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await fetch("/api/admin/logs?limit=100");
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error("Error loading logs:", err);
    }
  };

  // Filter and paginate logs
  const filteredLogs = logs.filter((log) => {
    const query = searchQuery.toLowerCase();
    return (
      log.question.toLowerCase().includes(query) ||
      log.answer.toLowerCase().includes(query) ||
      (log.userId && log.userId.toLowerCase().includes(query)) ||
      (log.model && log.model.toLowerCase().includes(query))
    );
  });

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  );

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
  };

  const handleSavePrompt = async () => {
    setSavingPrompt(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "system_prompt", value: systemPrompt }),
      });
      toast.success("Prompt salvo com sucesso!");
    } catch (err) {
      toast.error("Erro ao salvar prompt");
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleSaveModel = async () => {
    setSavingModel(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "model_name", value: modelName }),
      });
      toast.success("Modelo salvo com sucesso!");
    } catch (err) {
      toast.error("Erro ao salvar modelo");
    } finally {
      setSavingModel(false);
    }
  };

  const handleSaveThinkingEnabled = async () => {
    setSavingThinking(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "thinking_enabled",
          value: thinkingEnabled ? "true" : "false"
        }),
      });
      toast.success("Thinking Mode salvo com sucesso!");
    } catch (err) {
      toast.error("Erro ao salvar Thinking Mode");
    } finally {
      setSavingThinking(false);
    }
  };

  const handleSaveThinkingBudget = async () => {
    setSavingThinking(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "thinking_budget", value: thinkingBudget }),
      });
      toast.success("Budget de Thinking salvo com sucesso!");
    } catch (err) {
      toast.error("Erro ao salvar budget de Thinking");
    } finally {
      setSavingThinking(false);
    }
  };

  const handleAddResource = async () => {
    if (!newResourceContent.trim()) {
      toast.error("O conteúdo é obrigatório");
      return;
    }

    setAddingResource(true);
    try {
      await fetch("/api/admin/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newResourceContent,
          title: newResourceTitle || undefined,
          documentType: newResourceType || undefined,
          sourceUrl: newResourceUrl || undefined,
        }),
      });
      setNewResourceContent("");
      setNewResourceTitle("");
      setNewResourceType("");
      setNewResourceUrl("");
      loadResources();
      toast.success("Recurso adicionado com sucesso!");
    } catch (err) {
      toast.error("Erro ao adicionar recurso");
    } finally {
      setAddingResource(false);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este recurso?")) return;

    setDeletingResource(id);
    try {
      await fetch(`/api/admin/resources/${id}`, { method: "DELETE" });
      loadResources();
      toast.success("Recurso deletado com sucesso!");
    } catch (err) {
      toast.error("Erro ao deletar recurso");
    } finally {
      setDeletingResource(null);
    }
  };

  const handleExportLogs = async () => {
    setExportingLogs(true);
    try {
      const res = await fetch("/api/admin/logs/export");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-logs-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Logs exportados com sucesso!");
    } catch (err) {
      toast.error("Erro ao exportar logs");
    } finally {
      setExportingLogs(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white shadow dark:bg-gray-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            ChatBot Admin Dashboard
          </h1>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: "prompt", label: "System Prompt" },
              { id: "rag", label: "RAG Files" },
              { id: "logs", label: "Chat Logs" },
              { id: "settings", label: "Settings" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          {activeTab === "prompt" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                System Prompt Configuration
              </h2>
              <div>
                <Label htmlFor="system-prompt">System Prompt</Label>
                <textarea
                  id="system-prompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={15}
                  className="mt-1 w-full rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter the system prompt for the chatbot..."
                />
              </div>
              <Button onClick={handleSavePrompt} disabled={savingPrompt}>
                {savingPrompt ? "Salvando..." : "Salvar Prompt"}
              </Button>
            </div>
          )}

          {activeTab === "rag" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Add New Resource
                </h2>
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="resource-title">Title (optional)</Label>
                      <Input
                        id="resource-title"
                        type="text"
                        value={newResourceTitle}
                        onChange={(e) => setNewResourceTitle(e.target.value)}
                        className="mt-1"
                        placeholder="e.g., Lei nº 1234/2020"
                      />
                    </div>
                    <div>
                      <Label htmlFor="resource-type">Document Type (optional)</Label>
                      <Input
                        id="resource-type"
                        type="text"
                        value={newResourceType}
                        onChange={(e) => setNewResourceType(e.target.value)}
                        className="mt-1"
                        placeholder="e.g., lei, decreto, portaria"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="resource-url">Source URL (optional)</Label>
                    <Input
                      id="resource-url"
                      type="url"
                      value={newResourceUrl}
                      onChange={(e) => setNewResourceUrl(e.target.value)}
                      className="mt-1"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="resource-content">Content *</Label>
                    <textarea
                      id="resource-content"
                      value={newResourceContent}
                      onChange={(e) => setNewResourceContent(e.target.value)}
                      rows={8}
                      className="mt-1 w-full rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter the full text of legislation or document..."
                      required
                    />
                  </div>
                  <Button onClick={handleAddResource} disabled={addingResource}>
                    {addingResource ? "Adicionando..." : "Adicionar Recurso"}
                  </Button>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Existing Resources ({resources.length})
                </h2>
                <div className="mt-4 space-y-4">
                  {resources.map((resource) => (
                    <div
                      key={resource.id}
                      className="rounded-md border border-gray-200 p-4 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 dark:text-white">
                            {resource.content.substring(0, 200)}
                            {resource.content.length > 200 && "..."}
                          </p>
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {resource.embeddingCount} embeddings • Created{" "}
                            {new Date(resource.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          onClick={() => handleDeleteResource(resource.id)}
                          variant="outline"
                          size="sm"
                          className="ml-4"
                          disabled={deletingResource === resource.id}
                        >
                          {deletingResource === resource.id ? "Deletando..." : "Deletar"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Chat Logs ({logs.length})
                </h2>
                <Button onClick={handleExportLogs} variant="outline" disabled={exportingLogs}>
                  {exportingLogs ? "Exportando..." : "Exportar CSV"}
                </Button>
              </div>

              {/* Search Box */}
              <div>
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1); // Reset to first page on search
                  }}
                  placeholder="Buscar por pergunta, resposta, usuário ou modelo..."
                  className="w-full"
                />
                {searchQuery && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Mostrando {filteredLogs.length} de {logs.length} resultados
                  </p>
                )}
              </div>

              {/* Logs List */}
              <div className="space-y-4">
                {paginatedLogs.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    Nenhum log encontrado
                  </p>
                ) : (
                  paginatedLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-md border border-gray-200 p-4 dark:border-gray-700"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {log.userId || "anonymous"} •{" "}
                          {new Date(log.createdAt).toLocaleString("pt-BR")} •{" "}
                          {log.model || "unknown"}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            Pergunta:
                          </p>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {log.question}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            Resposta:
                          </p>
                          <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                            {log.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      Anterior
                    </Button>
                    <Button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Model Configuration
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="model-name">Model Name</Label>
                    <Input
                      id="model-name"
                      type="text"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      className="mt-1"
                      placeholder="e.g., google/gemini-2.5-flash, openai/gpt-4o"
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Supported: <span className="font-mono">google/gemini-*</span>, <span className="font-mono">openai/*</span>, <span className="font-mono">anthropic/*</span>
                    </p>
                  </div>
                  <Button onClick={handleSaveModel} disabled={savingModel}>
                    {savingModel ? "Salvando..." : "Salvar Modelo"}
                  </Button>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Gemini Thinking Mode
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      id="thinking-enabled"
                      type="checkbox"
                      checked={thinkingEnabled}
                      onChange={(e) => setThinkingEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <Label htmlFor="thinking-enabled" className="cursor-pointer">
                      Enable Thinking Mode
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    When enabled, Gemini models will show their reasoning process for complex queries. Only works with Google Gemini models.
                  </p>
                  <Button onClick={handleSaveThinkingEnabled} size="sm" disabled={savingThinking}>
                    {savingThinking ? "Salvando..." : "Salvar Thinking Mode"}
                  </Button>

                  {thinkingEnabled && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                      <Label htmlFor="thinking-budget">Thinking Budget (tokens)</Label>
                      <Input
                        id="thinking-budget"
                        type="number"
                        min="1024"
                        max="16384"
                        step="1024"
                        value={thinkingBudget}
                        onChange={(e) => setThinkingBudget(e.target.value)}
                        className="mt-1"
                      />
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Maximum tokens for reasoning. Recommended: 8192. Range: 1024-16384.
                      </p>
                      <Button onClick={handleSaveThinkingBudget} size="sm" className="mt-2" disabled={savingThinking}>
                        {savingThinking ? "Salvando..." : "Salvar Budget"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
