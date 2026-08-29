'use client';

import dynamic from 'next/dynamic';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { CloseButton } from '@/components/ui/close-button';

const LeafletRoute = dynamic(
  () => import('./leaflet-route').then((mod) => mod.LeafletRoute),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted/10 animate-pulse" />,
  }
);

interface RouteMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coordinates: [number, number][];
  date: string | null;
}

export function RouteMapDialog({ open, onOpenChange, coordinates, date }: RouteMapDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="max-w-3xl p-0 overflow-hidden gap-0">
        <DialogHeader className="p-4 pb-2 relative">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">
              Parcours du{' '}
              {date
                ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
                : 'séance'}
            </DialogTitle>
            <DialogClose asChild>
              <CloseButton />
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="w-full h-[60vh]">
          {coordinates.length > 0 && (
            <LeafletRoute coordinates={coordinates} height="100%" interactive={true} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
