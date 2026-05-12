import React, { useState, useEffect } from 'react';
import { mockEngineInstance } from '../lib/mockEngine';
import { NetworkLog } from '../types/advanced';
import { Code, Copy, Download, RefreshCw, Layers } from 'lucide-react';

export default function AutoTestGenerator() {
  const [logs, setLogs] = useState<NetworkLog[]>([]);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [framework, setFramework] = useState<'playwright' | 'cypress'>('playwright');
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLogs(mockEngineInstance.getLogs());
  }, []);

  const handleRefresh = () => {
    setLogs(mockEngineInstance.getLogs());
  };

  const toggleLogSelection = (id: string) => {
    const newSet = new Set(selectedLogs);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedLogs(newSet);
  };

  const selectAll = () => {
    setSelectedLogs(new Set(logs.map(l => l.id)));
  };

  const deselectAll = () => {
    setSelectedLogs(new Set());
  };

  const generatePlaywrightCode = (selected: NetworkLog[]) => {
    let code = `import { test, expect } from '@playwright/test';\n\n`;
    code += `test('auto-generated network test', async ({ page }) => {\n`;
    
    selected.forEach((log, index) => {
      const url = new URL(log.url);
      const isApi = log.url.includes('/api/') || url.pathname.endsWith('.json');
      
      code += `  // Step ${index + 1}: ${log.method} ${url.pathname}\n`;
      
      if (isApi) {
        // Generate mock or assertion for API
        code += `  await page.route('**${url.pathname}**', async route => {\n`;
        code += `    await route.fulfill({\n`;
        code += `      status: ${log.status},\n`;
        code += `      contentType: 'application/json',\n`;
        
        let bodyToInject = '{}';
        try {
          if (log.responseBody) {
             // simplify body to avoid massive files, just structure
             bodyToInject = JSON.stringify(JSON.parse(log.responseBody), null, 2).replace(/\n/g, '\n      ');
          }
        } catch {}
        
        code += `      body: JSON.stringify(${bodyToInject})\n`;
        code += `    });\n  });\n\n`;
      } else {
        // Likely a page navigation
        if (log.method === 'GET') {
          code += `  await page.goto('${log.url}');\n\n`;
        }
      }
    });
    
    code += `  // Add your assertions here\n`;
    code += `  // await expect(page.locator('.some-element')).toBeVisible();\n`;
    code += `});\n`;
    return code;
  };

  const generateCypressCode = (selected: NetworkLog[]) => {
    let code = `describe('Auto-generated network test', () => {\n`;
    code += `  it('should replay recorded steps', () => {\n\n`;
    
    selected.forEach((log, index) => {
      const url = new URL(log.url);
      const isApi = log.url.includes('/api/') || url.pathname.endsWith('.json');
      
      code += `    // Step ${index + 1}: ${log.method} ${url.pathname}\n`;
      
      if (isApi) {
        code += `    cy.intercept('${log.method}', '**${url.pathname}**', {\n`;
        code += `      statusCode: ${log.status},\n`;
        
        let bodyToInject = '{}';
        try {
          if (log.responseBody) {
             bodyToInject = JSON.stringify(JSON.parse(log.responseBody), null, 2).replace(/\n/g, '\n      ');
          }
        } catch {}
        
        code += `      body: ${bodyToInject}\n`;
        code += `    }).as('request${index}');\n\n`;
      } else {
        if (log.method === 'GET') {
          code += `    cy.visit('${log.url}');\n\n`;
        }
      }
    });
    
    code += `    // Add your assertions here\n`;
    code += `    // cy.get('.some-element').should('be.visible');\n`;
    code += `  });\n});\n`;
    return code;
  };

  const generateCode = () => {
    const selected = logs.filter(l => selectedLogs.has(l.id)).reverse(); // chronological
    if (selected.length === 0) {
      setGeneratedCode('// Select requests from the left panel to generate code.');
      return;
    }

    if (framework === 'playwright') {
      setGeneratedCode(generatePlaywrightCode(selected));
    } else {
      setGeneratedCode(generateCypressCode(selected));
    }
  };

  useEffect(() => {
    generateCode();
  }, [selectedLogs, framework]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    alert('Code copied to clipboard!');
  };

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen font-sans flex flex-col h-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center gap-3">
            <Code className="w-8 h-8 text-cyan-400" />
            Auto-Test Generator
          </h1>
          <p className="text-gray-400 mt-1">Convert recorded network sessions into E2E test scripts.</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setFramework('playwright')}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                framework === 'playwright' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Playwright
            </button>
            <button
              onClick={() => setFramework('cypress')}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                framework === 'cypress' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Cypress
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Timeline Selection */}
        <div className="lg:col-span-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden flex flex-col shadow-xl">
          <div className="p-4 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Layers className="w-5 h-5" /> Timeline
            </h2>
            <div className="flex gap-2">
              <button onClick={handleRefresh} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Refresh logs"><RefreshCw className="w-4 h-4" /></button>
              <button onClick={selectAll} className="text-xs text-blue-400 hover:underline">All</button>
              <button onClick={deselectAll} className="text-xs text-gray-400 hover:underline">None</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {logs.length === 0 ? (
              <div className="text-center p-8 text-gray-500 text-sm">
                No network activity recorded.
              </div>
            ) : logs.map(log => {
              const isSelected = selectedLogs.has(log.id);
              return (
                <div 
                  key={log.id}
                  onClick={() => toggleLogSelection(log.id)}
                  className={`px-3 py-2 rounded-lg text-sm border cursor-pointer transition-all ${
                    isSelected ? 'bg-blue-900/30 border-blue-500/50' : 'bg-gray-900/50 border-transparent hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={isSelected} readOnly className="accent-blue-500 rounded" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <span className={`font-mono text-xs font-bold ${
                          log.method === 'GET' ? 'text-blue-400' : 'text-emerald-400'
                        }`}>{log.method}</span>
                        <span className={log.status >= 400 ? 'text-red-400' : 'text-gray-400'}>{log.status}</span>
                      </div>
                      <div className="truncate text-gray-300 mt-0.5" title={log.url}>
                        {new URL(log.url).pathname}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Code Output */}
        <div className="lg:col-span-2 bg-gray-950 border border-gray-700 rounded-xl overflow-hidden flex flex-col shadow-xl">
          <div className="p-4 border-b border-gray-700 bg-gray-800/80 flex justify-between items-center">
            <h2 className="text-lg font-semibold font-mono text-gray-300">GeneratedSpec.{framework === 'playwright' ? 'ts' : 'cy.ts'}</h2>
            <div className="flex gap-2">
              <button 
                onClick={handleCopy}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
              <button 
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                onClick={() => {
                  const blob = new Blob([generatedCode], { type: 'text/typescript' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `test.${framework === 'playwright' ? 'spec.ts' : 'cy.ts'}`;
                  a.click();
                }}
              >
                <Download className="w-4 h-4" /> Save File
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 custom-scrollbar relative">
            <pre className="font-mono text-sm text-green-400 whitespace-pre-wrap">
              {generatedCode}
            </pre>
            {selectedLogs.size === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80 text-gray-400">
                <div className="text-center">
                  <Code className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Select requests from the timeline to generate test code.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
