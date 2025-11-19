"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if already logged in
    fetch("/api/admin/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          router.push("/admin/dashboard");
        }
      })
      .catch(() => {});
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/admin/dashboard");
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-2xl dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-center">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-4xl">🇧🇷</span>
            <div className="h-12 w-1 bg-gradient-to-b from-green-500 via-yellow-400 to-blue-500" />
            <span className="text-4xl">⚖️</span>
          </div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            ChatBot Admin
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Oficiais de Chancelaria
          </p>
          <p className="mt-1 text-center text-xs text-gray-500 dark:text-gray-500">
            Ministério das Relações Exteriores
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2">
                <span className="text-red-600 dark:text-red-400">⚠️</span>
                <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <Label htmlFor="username" className="text-gray-700 dark:text-gray-300 font-medium">
                Usuário
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="mt-2 h-11 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Digite seu usuário"
                autoComplete="username"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-700 dark:text-gray-300 font-medium">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-2 h-11 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Digite sua senha"
                autoComplete="current-password"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 font-medium text-base"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-label="Carregando"
                  role="img"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Entrando...
              </span>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>

        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            Sistema de administração do ChatBot especializado para Oficiais de Chancelaria
          </p>
        </div>
      </div>
    </div>
  );
}
