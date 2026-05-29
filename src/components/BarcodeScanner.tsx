import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const regionId = "barcode-scanner-region";

  useEffect(() => {
    if (isOpen) {
      setIsInitializing(true);
      // Small delay to ensure the DOM element is rendered
      const timer = setTimeout(() => {
        try {
          const scanner = new Html5QrcodeScanner(
            regionId,
            { 
              fps: 10, 
              qrbox: { width: 250, height: 150 },
              aspectRatio: 1.0,
              formatsToSupport: [
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
              ]
            },
            /* verbose= */ false
          );

          scanner.render(
            (decodedText) => {
              onScan(decodedText);
              scanner.clear();
              onClose();
            },
            (errorMessage) => {
              // We don't want to spam toasts for every failed frame scan
              // console.warn(errorMessage);
            }
          );
          
          scannerRef.current = scanner;
          setIsInitializing(false);
        } catch (err) {
          console.error("Failed to start scanner:", err);
          toast.error("Não foi possível acessar a câmera.");
          onClose();
        }
      }, 500);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
        }
      };
    }
  }, [isOpen, onScan, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-none p-0 overflow-hidden bg-black rounded-[32px]">
        <DialogHeader className="p-6 bg-white border-b">
          <DialogTitle className="flex items-center gap-2 font-black uppercase italic tracking-tighter">
            <Camera className="text-green-600" /> Escanear Código
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative aspect-square w-full bg-black flex flex-col items-center justify-center">
          {isInitializing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-black/50 text-white">
              <Loader2 className="animate-spin" size={32} />
              <p className="text-[10px] font-black uppercase tracking-widest">Iniciando Câmera...</p>
            </div>
          )}
          
          <div id={regionId} className="w-full h-full" />
          
          {/* Overlay hints */}
          <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40">
            <div className="w-full h-full border-2 border-green-500 rounded-2xl relative shadow-[0_0_20px_rgba(34,197,94,0.3)]">
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
              
              <div className="absolute top-1/2 left-0 w-full h-[2px] bg-red-500/50 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white">
          <p className="text-[10px] text-zinc-400 font-bold uppercase text-center mb-4">
            Aponte para o código de barras do produto
          </p>
          <Button 
            variant="outline" 
            className="w-full rounded-2xl font-black uppercase text-xs h-12 border-2"
            onClick={onClose}
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
