"use client";

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError("Please enter your username.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ username: trimmedUsername, password });
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (
          err.message.includes("401") ||
          err.message.toLowerCase().includes("invalid username") ||
          err.message.toLowerCase().includes("unauthorized")
        ) {
          setError("Invalid username or password.");
        } else if (
          err.message.toLowerCase().includes("failed to fetch") ||
          err.message.toLowerCase().includes("network") ||
          err.message.toLowerCase().includes("connection")
        ) {
          setError("Unable to connect to the server. Please try again.");
        } else {
          setError(err.message || "Invalid username or password.");
        }
      } else {
        setError("Unable to connect to the server. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-sm bg-white dark:bg-[#121214] p-8 rounded-xl shadow-xs border border-gray-200 dark:border-[#26262B]">
        <div className="mb-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-md ring-2 ring-blue-500/20 mb-3">
            M
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-[#F3F4F6] tracking-tight">
            Maruti <span className="text-blue-600 dark:text-blue-400 font-bold">Enterprises</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Sign in to access the management portal
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 p-3 rounded-md bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/50 text-xs text-red-700 dark:text-rose-400 font-medium"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E34] rounded-md text-sm text-gray-900 dark:text-[#F3F4F6] bg-white dark:bg-[#17171A] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter username"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E34] rounded-md text-sm text-gray-900 dark:text-[#F3F4F6] bg-white dark:bg-[#17171A] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter password"
              disabled={isSubmitting}
            />
          </div>

          <div className="pt-2">
            <button
              id="login-button"
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-xs text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isSubmitting ? "Signing in..." : "Login"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
