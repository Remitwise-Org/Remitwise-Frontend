'use client';

import 'swagger-ui-react/swagger-ui.css';
import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import Image from 'next/image';
import Link from 'next/link';

type SwaggerUIWrapperProps = {
  specUrl: string;
};

export default function SwaggerUIWrapper({ specUrl }: SwaggerUIWrapperProps) {
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-dark via-gray-900 to-brand-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading API Documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <Image 
                  src="/logo.svg" 
                  width={32} 
                  height={32} 
                  alt="RemitWise logo" 
                  className="w-8 h-8"
                />
                <span className="text-brand-dark text-lg font-bold tracking-tight">RemitWise</span>
              </Link>
              <div className="hidden sm:block w-px h-6 bg-gray-300"></div>
              <h1 className="text-gray-700 font-semibold text-base sm:text-lg">API Documentation</h1>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                href="/api/docs" 
                className="text-brand-red font-medium hover:text-red-700 transition-colors"
              >
                API Docs
              </Link>
              <Link 
                href="/" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Back to App
              </Link>
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2"
              aria-label="Toggle navigation menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {sidebarOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-2">
              <Link 
                href="/api/docs" 
                className="block px-3 py-2 text-brand-red font-medium rounded-md hover:bg-red-50 transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                API Docs
              </Link>
              <Link 
                href="/" 
                className="block px-3 py-2 text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                Back to App
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-brand-dark to-gray-800 text-white">
          <div className="px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="max-w-3xl">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
                RemitWise API Documentation
              </h2>
              <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-6">
                Complete reference for integrating with RemitWise's remittance and financial planning services. 
                Build secure, scalable applications with our comprehensive API.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>REST API</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>OpenAPI 3.0</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span>JSON Responses</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Swagger UI Container */}
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="swagger-ui-container">
              <SwaggerUI 
                url={specUrl}
                docExpansion="list"
                defaultModelsExpandDepth={1}
                defaultModelExpandDepth={1}
                displayOperationId={false}
                displayRequestDuration={true}
                filter={true}
                showExtensions={true}
                showCommonExtensions={true}
                tryItOutEnabled={true}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Image 
                src="/logo.svg" 
                width={24} 
                height={24} 
                alt="RemitWise logo" 
                className="w-6 h-6"
              />
              <span className="text-gray-600 text-sm">
                © 2024 RemitWise. All rights reserved.
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/privacy" className="text-gray-600 hover:text-gray-900 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-600 hover:text-gray-900 transition-colors">
                Terms of Service
              </Link>
              <Link href="/support" className="text-gray-600 hover:text-gray-900 transition-colors">
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        /* Custom Swagger UI Styling */
        .swagger-ui-container .swagger-ui {
          font-family: inherit;
        }
        
        .swagger-ui-container .swagger-ui .topbar {
          display: none;
        }
        
        .swagger-ui-container .swagger-ui .info {
          margin: 0;
          padding: 0;
        }
        
        .swagger-ui-container .swagger-ui .info .title {
          color: #0A0A0A;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        
        .swagger-ui-container .swagger-ui .info .description {
          color: #4B5563;
          font-size: 1rem;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }
        
        .swagger-ui-container .swagger-ui .scheme-container {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .swagger-ui-container .swagger-ui .opblock.opblock-get .opblock-summary-method {
          background: #10B981;
        }
        
        .swagger-ui-container .swagger-ui .opblock.opblock-post .opblock-summary-method {
          background: #3B82F6;
        }
        
        .swagger-ui-container .swagger-ui .opblock.opblock-put .opblock-summary-method {
          background: #F59E0B;
        }
        
        .swagger-ui-container .swagger-ui .opblock.opblock-delete .opblock-summary-method {
          background: #EF4444;
        }
        
        .swagger-ui-container .swagger-ui .opblock.opblock-patch .opblock-summary-method {
          background: #8B5CF6;
        }
        
        .swagger-ui-container .swagger-ui .opblock-summary-path {
          color: #374151;
          font-weight: 600;
        }
        
        .swagger-ui-container .swagger-ui .opblock-summary-description {
          color: #6B7280;
        }
        
        .swagger-ui-container .swagger-ui .btn.authorize {
          background-color: #D72323;
          border-color: #D72323;
        }
        
        .swagger-ui-container .swagger-ui .btn.authorize:hover {
          background-color: #B91C1C;
          border-color: #B91C1C;
        }
        
        .swagger-ui-container .swagger-ui .btn.execute {
          background-color: #D72323;
          border-color: #D72323;
        }
        
        .swagger-ui-container .swagger-ui .btn.execute:hover {
          background-color: #B91C1C;
          border-color: #B91C1C;
        }
        
        /* Focus styles for accessibility */
        .swagger-ui-container .swagger-ui .btn:focus,
        .swagger-ui-container .swagger-ui .opblock-summary:focus {
          outline: 2px solid #D72323;
          outline-offset: 2px;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .swagger-ui-container .swagger-ui .opblock-summary {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
          
          .swagger-ui-container .swagger-ui .opblock-summary-method {
            margin-right: 0;
            margin-bottom: 0.25rem;
          }
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .swagger-ui-container .swagger-ui .opblock-summary-method {
            border: 2px solid currentColor;
          }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .swagger-ui-container .swagger-ui * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
