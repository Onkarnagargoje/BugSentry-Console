import React from 'react';
import { FiZap } from 'react-icons/fi';

export function TypingIndicator() {
  return (
    <div className="chat-msg chat-msg-bot">
      <div className="chat-bot-avatar">
        <FiZap size={10} />
      </div>
      <div className="chat-typing">
        <span /><span /><span />
      </div>
    </div>
  );
}

export function ChatMessage({ msg }) {
  return (
    <div className={`chat-msg ${msg.role === 'user' ? 'chat-msg-user' : 'chat-msg-bot'}`}>
      {msg.role === 'bot' && (
        <div className="chat-bot-avatar">
          <FiZap size={10} />
        </div>
      )}
      <div className="chat-bubble">{msg.text}</div>
    </div>
  );
}
