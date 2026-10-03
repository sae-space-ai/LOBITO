import { useState, useEffect, useCallback } from 'react';
import { Order } from '../types';
import { agentEngine, AgentEngineState } from '../core/engine';
import { QwenConnectionStatus } from '../core/qwenAdapter';

export function useAgent() {
  const [state, setState] = useState<AgentEngineState>(agentEngine.getState());
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResult, setCurrentResult] = useState<Order | null>(null);

  useEffect(() => {
    const unsubscribe = agentEngine.subscribe((newState) => {
      setState({ ...newState });
    });
    return unsubscribe;
  }, []);

  const submitOrder = useCallback(async (input: string) => {
    if (!input.trim()) return;
    setIsProcessing(true);
    setCurrentResult(null);
    
    try {
      const order = await agentEngine.submitOrder(input);
      setCurrentResult(order);
      return order;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const approveOrder = useCallback(async (orderId: string) => {
    setIsProcessing(true);
    try {
      const order = await agentEngine.approveOrder(orderId);
      if (order) setCurrentResult(order);
      return order;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const rejectOrder = useCallback((orderId: string) => {
    const order = agentEngine.rejectOrder(orderId);
    if (order) setCurrentResult(order);
    return order;
  }, []);

  const clearHistory = useCallback(() => {
    agentEngine.clearOrders();
    setCurrentResult(null);
  }, []);

  const configureQwen = useCallback((config: { apiKey: string; endpoint?: string; model?: string }) => {
    agentEngine.configureQwen(config);
  }, []);

  const checkQwenHealth = useCallback(async (): Promise<QwenConnectionStatus> => {
    return agentEngine.checkQwenHealth();
  }, []);

  return {
    state,
    isProcessing,
    currentResult,
    submitOrder,
    approveOrder,
    rejectOrder,
    clearHistory,
    configureQwen,
    checkQwenHealth,
  };
}
