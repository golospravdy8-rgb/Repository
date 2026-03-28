"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;
    onClose();
    router.push("/chat");
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
