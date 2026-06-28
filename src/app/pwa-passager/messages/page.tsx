'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface Message {
  id: string;
  senderType: string;
  senderName: string;
  message: string;
  createdAt: string;
}

export default function PwaPassagerMessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ticketId = typeof window !== 'undefined' ? localStorage.getItem('busgo_ticket_id') : null;

  const fetchMessages = useCallback(async () => {
    if (!ticketId) return;
    try {
      const res = await fetch(`/api/busgo/messages?ticketId=${ticketId}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.data || []);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !ticketId) return;
    setSending(true);
    try {
      const res = await fetch('/api/busgo/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ticketId, message: input.trim() }),
      });
      if (!res.ok) return;
      setInput('');
      fetchMessages();
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-amber-50"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white">
        <Button variant="ghost" size="icon" onClick={() => router.push('/pwa-passager')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white rounded-full p-1.5"><MessageCircle className="h-4 w-4" /></div>
          <div>
            <p className="font-medium text-sm">Messages</p>
            <p className="text-xs text-muted-foreground">Communiquez avec le chauffeur</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucun message. Envoyez votre premier message au chauffeur.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.senderType === 'passenger' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-lg p-3 ${msg.senderType === 'passenger' ? 'bg-amber-600 text-white' : 'bg-white border'}`}>
                {msg.senderType !== 'passenger' && <p className="text-xs font-medium text-muted-foreground mb-1">{msg.senderName}</p>}
                <p className="text-sm">{msg.message}</p>
                <p className={`text-xs mt-1 ${msg.senderType === 'passenger' ? 'text-white/70' : 'text-muted-foreground'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white flex gap-2">
        <Input
          placeholder="Votre message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={sending || !input.trim()} className="bg-amber-600 hover:bg-amber-700">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
