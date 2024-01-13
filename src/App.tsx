import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

// webcontainer
import { WebContainer } from "@webcontainer/api";

// xterm
import { Terminal } from "xterm";
import "xterm/css/xterm.css";
import { FitAddon } from "xterm-addon-fit";

// files we want to mount to webcontainer
import { files } from "./files";

// write new content to index.js file using webcontainer
async function writeIndexJS(
  webcontainerInstance: WebContainer,
  content: string
) {
  await webcontainerInstance.fs.writeFile("/index.js", content);
}

// start shell process using webcontainer and xterm
async function startShell(
  webcontainerInstance: WebContainer,
  terminal: Terminal
) {
  // use jsh as shell process
  const shellProcess = await webcontainerInstance.spawn("jsh", {
    terminal: {
      cols: terminal.cols,
      rows: terminal.rows,
    },
  });

  // pipe shell process output to the terminal
  shellProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        terminal.write(data);
      },
    })
  );

  // pipe terminal input to shell process input
  const input = shellProcess.input.getWriter();
  terminal.onData((data) => {
    input.write(data);
  });

  return shellProcess;
}

function App() {
  const [mounted, setMounted] = useState(false);
  const [terminalStarted, setTerminalStarted] = useState(false);
  const [textareaValue, setTextareaValue] = useState("");

  const [webContainerInstance, setWebContainerInstance] =
    useState<WebContainer | null>(null);
  const [terminalInstance, setTerminalInstance] = useState<Terminal | null>(
    null
  );

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const terminalDivRef = useRef<HTMLDivElement | null>(null);

  // effect that initialize textarea value as index.js file content
  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }
    setTextareaValue(files["index.js"].file.contents);
  }, [textareaRef]);

  // callback that update textareaValue when textarea value is updated
  const onChange = useCallback(
    async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setTextareaValue(e.target.value);
    },
    []
  );

  // initialize webcontainer and terminal
  useEffect(() => {
    const thisEffect = async () => {
      if (mounted) {
        return;
      }
      setMounted(true);
      try {
        // initialize terminal
        const newTerminalInstance = new Terminal({
          convertEol: true,
        });
        const fitAddon = new FitAddon();
        newTerminalInstance.loadAddon(fitAddon);
        setTerminalInstance(newTerminalInstance);
        // initialize webcontainer
        const newWebcontainerInstance = await WebContainer.boot();
        await newWebcontainerInstance.mount(files);
        setWebContainerInstance(newWebcontainerInstance);
      } catch (error) {
        console.error(error);
      }
    };
    thisEffect();
  }, [mounted]);

  // effect that setup webcontainer to update iframe when server-ready event is emitted
  useEffect(() => {
    if (!webContainerInstance) {
      return;
    }
    webContainerInstance.on("server-ready", (_port, url) => {
      if (!iframeRef.current) {
        return;
      }
      iframeRef.current.src = url;
    });
  }, [webContainerInstance, terminalInstance]);

  // effect that attach terminal to terminalDivRef and start shell process
  useEffect(() => {
    const thisEffect = async () => {
      if (!terminalDivRef.current) {
        return;
      }
      if (terminalStarted) {
        return;
      }
      if (!terminalInstance) {
        return;
      }
      if (!webContainerInstance) {
        return;
      }
      terminalInstance.open(terminalDivRef.current);
      setTerminalStarted(true);
      startShell(webContainerInstance, terminalInstance);
    };
    thisEffect();
  }, [terminalInstance, terminalDivRef, terminalStarted, webContainerInstance]);

  // effect that update index.js file as textarea value when textareaValue is updated
  useEffect(() => {
    if (!webContainerInstance) {
      return;
    }
    if (!textareaValue) {
      return;
    }
    const thisEffect = async () => {
      await writeIndexJS(webContainerInstance, textareaValue);
    };
    thisEffect();
  }, [textareaValue, webContainerInstance]);

  return (
    <>
      <div className="container">
        <div className="editor">
          <textarea
            ref={textareaRef}
            value={textareaValue}
            onChange={onChange}
          />
        </div>
        <div className="preview">
          <iframe ref={iframeRef} src="loading.html"></iframe>
        </div>
      </div>
      <div ref={terminalDivRef} className="terminalWrap"></div>
    </>
  );
}

export default App;
