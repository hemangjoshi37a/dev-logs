import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Folder, File, Code, Play, ChevronRight, CornerDownRight } from 'lucide-react';

interface FileItem {
  name: string;
  isDirectory: boolean;
  path: string;
}

export default function ExecutionEngine() {
  const [currentDir, setCurrentDir] = useState<string>('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  
  const [command, setCommand] = useState('');
  const [terminalOutput, setTerminalOutput] = useState<{ type: 'command' | 'stdout' | 'stderr' | 'error'; text: string }[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Load initial directory
  useEffect(() => {
    fetchFiles('');
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalOutput]);

  const fetchFiles = async (dirPath: string) => {
    try {
      const res = await fetch(`http://localhost:4445/api/system/ls?dir=${encodeURIComponent(dirPath)}`);
      const data = await res.json();
      if (data.status === 'success') {
        setCurrentDir(data.currentDir);
        setFiles(data.files);
      } else {
        setTerminalOutput(prev => [...prev, { type: 'error', text: `Failed to list directory: ${data.detail}` }]);
      }
    } catch (err) {
      setTerminalOutput(prev => [...prev, { type: 'error', text: `Network error: ${(err as Error).message}` }]);
    }
  };

  const fetchFileContent = async (filePath: string) => {
    try {
      const res = await fetch(`http://localhost:4445/api/system/cat?file=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.status === 'success') {
        setActiveFile(filePath);
        setFileContent(data.content);
      } else {
        setTerminalOutput(prev => [...prev, { type: 'error', text: `Failed to read file: ${data.detail}` }]);
      }
    } catch (err) {
      setTerminalOutput(prev => [...prev, { type: 'error', text: `Network error: ${(err as Error).message}` }]);
    }
  };

  const handleExecute = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!command.trim()) return;

    setTerminalOutput(prev => [...prev, { type: 'command', text: `${currentDir}> ${command}` }]);
    setIsExecuting(true);

    try {
      const res = await fetch('http://localhost:4445/api/system/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, cwd: currentDir })
      });
      const data = await res.json();
      
      if (data.stdout) {
        setTerminalOutput(prev => [...prev, { type: 'stdout', text: data.stdout }]);
      }
      if (data.stderr) {
        setTerminalOutput(prev => [...prev, { type: 'stderr', text: data.stderr }]);
      }
      if (data.status === 'error' && data.detail) {
        setTerminalOutput(prev => [...prev, { type: 'error', text: data.detail }]);
      }
    } catch (err) {
      setTerminalOutput(prev => [...prev, { type: 'error', text: `Execution failed: ${(err as Error).message}` }]);
    } finally {
      setIsExecuting(false);
      setCommand('');
    }
  };

  const handleNavigateUp = () => {
    // Basic way to go up a directory: trim the last segment
    const parts = currentDir.split(/[/\\]/);
    if (parts.length > 1) {
      parts.pop();
      // handle windows 'C:' edge case
      const newDir = parts.length === 1 && parts[0].endsWith(':') ? parts[0] + '\\' : parts.join('\\');
      fetchFiles(newDir);
    }
  };

  return (
    <div className="h-full flex flex-col text-gray-200">
      
      {/* Top Section: File Browser + Editor */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar: File Explorer */}
        <div className="w-1/3 max-w-sm border-r border-gray-800 flex flex-col bg-gray-900/50">
          <div className="p-3 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Folder className="w-4 h-4 text-purple-400" />
              Source Code
            </h3>
          </div>
          
          <div className="p-2 text-xs truncate bg-gray-800/30 text-gray-400 cursor-pointer hover:text-white" onClick={handleNavigateUp} title="Go up one directory">
            <CornerDownRight className="w-3 h-3 inline mr-1 rotate-180" />
            {currentDir}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {files.map((file, idx) => (
              <div 
                key={idx} 
                onClick={() => {
                  if (file.isDirectory) {
                    fetchFiles(file.path);
                  } else {
                    fetchFileContent(file.path);
                  }
                }}
                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition-colors ${activeFile === file.path ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-gray-800'}`}
              >
                {file.isDirectory ? (
                  <Folder className="w-4 h-4 text-blue-400 shrink-0" />
                ) : (
                  <File className="w-4 h-4 text-gray-400 shrink-0" />
                )}
                <span className="truncate">{file.name}</span>
              </div>
            ))}
            {files.length === 0 && (
              <div className="text-gray-500 text-xs italic p-2">Empty directory or loading...</div>
            )}
          </div>
        </div>

        {/* Main: File Viewer */}
        <div className="flex-1 flex flex-col bg-gray-950 overflow-hidden relative">
          {activeFile ? (
            <>
              <div className="p-3 border-b border-gray-800 bg-gray-900 flex items-center gap-2 text-sm text-gray-300">
                <Code className="w-4 h-4 text-green-400" />
                <span className="truncate font-mono">{activeFile}</span>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-[#0d1117] text-[#c9d1d9]">
                <pre className="text-xs font-mono leading-relaxed" style={{ tabSize: 2 }}>
                  <code>{fileContent}</code>
                </pre>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center flex-col text-gray-600 gap-3">
              <Code className="w-12 h-12" />
              <p>Select a file to view its source code</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Execution Terminal */}
      <div className="h-64 border-t border-gray-800 flex flex-col bg-black">
        <div className="p-2 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Terminal className="w-4 h-4 text-green-400" />
            Execution Engine (Auto-Fixer)
          </h3>
          <button 
            onClick={() => setTerminalOutput([])}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Clear
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1 bg-[#0a0a0a]">
          {terminalOutput.map((out, idx) => (
            <div key={idx} className={`break-words whitespace-pre-wrap ${out.type === 'command' ? 'text-green-400 font-bold mt-2' : out.type === 'error' ? 'text-red-400' : out.type === 'stderr' ? 'text-yellow-400' : 'text-gray-300'}`}>
              {out.text}
            </div>
          ))}
          {terminalOutput.length === 0 && (
            <div className="text-gray-600 italic">No output yet. Try running an npm or git command.</div>
          )}
          <div ref={terminalEndRef} />
        </div>

        <form onSubmit={handleExecute} className="p-2 bg-gray-900 flex items-center gap-2 border-t border-gray-800">
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="npm run test, git status, git apply..."
            className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-white placeholder-gray-600"
            disabled={isExecuting}
            autoFocus
          />
          <button 
            type="submit" 
            disabled={!command.trim() || isExecuting}
            className="p-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition-colors"
          >
            <Play className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
}
