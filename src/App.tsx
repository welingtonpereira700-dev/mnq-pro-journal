import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, PlusCircle, Wallet, BarChart3, Trash2, Upload,
  CheckCircle2, XCircle, Filter, Clock, Award,
  Image as ImageIcon, X, RefreshCw, MessageSquare, ChevronDown, ChevronUp, Edit3, Save, Percent, DollarSign
} from 'lucide-react';
import { supabase } from './supabaseClient';

interface Trade {
  id: number;
  data: string;
  sessao: string;
  conta_id: string;
  tipo_conta: string;
  ativo: string;
  direcao: 'Buy' | 'Sell';
  resultado: 'TP' | 'SL' | 'BE';
  pnl: number;
  duracao: string;
  seguiu_plano: boolean;
  emocao: string;
  comentarios: string;
  foto_url?: string;
}

interface Conta {
  id: number;
  nome: string;
  tipo: 'Teste' | 'Real';
  status: 'Em andamento' | 'Aprovada' | 'Reprovada';
  tamanho: string;
  numero: string;
}

interface Movimentacao {
  id: number;
  empresa: string;
  tipo: 'Custo' | 'Retiro';
  valor: number;
  data: string;
  comprovante_url?: string;
}

const EMOCOES = [
  { label: 'Tranquilo', emoji: '😌' },
  { label: 'Impaciente', emoji: '😤' },
  { label: 'Ansioso', emoji: '😬' },
  { label: 'Com Medo', emoji: '😰' },
  { label: 'Eufórico', emoji: '🤩' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'operacoes' | 'mesas'>('operacoes');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dados
  const [trades, setTrades] = useState<Trade[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);

  // Filtros e Dashboard
  const [periodoFiltro, setPeriodoFiltro] = useState<string>('15d');
  const [dataInicioFiltro, setDataInicioFiltro] = useState('');
  const [dataFimFiltro, setDataFimFiltro] = useState('');
  const [contaFiltro, setContaFiltro] = useState<string>('todas');
  const [ordenacao, setOrdenacao] = useState<'data_desc' | 'data_asc' | 'pnl_desc' | 'pnl_asc'>('data_desc');
  const [notasPeriodo, setNotasPeriodo] = useState<string>(() => localStorage.getItem('trading_notas_periodo') || '');
  const [mostrarPorcentagem, setMostrarPorcentagem] = useState(false);

  // Modais
  const [modal, setModal] = useState<{ tipo: 'imagem' | 'texto', conteudo: string, titulo?: string } | null>(null);

  // Formulário de Trade
  const [editingTradeId, setEditingTradeId] = useState<number | null>(null);
  const [dataTrade, setDataTrade] = useState(new Date().toISOString().split('T')[0]);
  const [sessao, setSessao] = useState('NY');
  const [contaId, setContaId] = useState('');
  const [tipoContaTrade, setTipoContaTrade] = useState('Exame');
  const [direcao, setDirecao] = useState<'Buy' | 'Sell'>('Buy');
  const [resultado, setResultado] = useState<'TP' | 'SL' | 'BE'>('TP');
  const [pnl, setPnl] = useState('');
  const [duracaoValor, setDuracaoValor] = useState('');
  const [duracaoUnidade, setDuracaoUnidade] = useState<'min' | 'H'>('min');
  const [seguiuPlano, setSeguiuPlano] = useState(true);
  const [emocao, setEmocao] = useState('Tranquilo');
  const [comentarios, setComentarios] = useState('');
  const [fotoTrade, setFotoTrade] = useState<File | null>(null);

  // Formulário de Conta
  const [nomeConta, setNomeConta] = useState('');
  const [tipoConta, setTipoConta] = useState<'Teste' | 'Real'>('Teste');
  const [tamanhoConta, setTamanhoConta] = useState('50K');
  const [numeroConta, setNumeroConta] = useState('');
  const [editContaId, setEditContaId] = useState<number | null>(null);
  const [editContaData, setEditContaData] = useState<Partial<Conta>>({});

  // Formulário de Movimentação
  const [empresaMov, setEmpresaMov] = useState('');
  const [tipoMov, setTipoMov] = useState<'Custo' | 'Retiro'>('Custo');
  const [valorMov, setValorMov] = useState('');
  const [dataMov, setDataMov] = useState(new Date().toISOString().split('T')[0]);
  const [fotoComprovante, setFotoComprovante] = useState<File | null>(null);

  useEffect(() => { localStorage.setItem('trading_notas_periodo', notasPeriodo); }, [notasPeriodo]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resTrades, resContas, resMov] = await Promise.all([
        supabase.from('trades').select('*').order('data', { ascending: false }).order('id', { ascending: false }),
        supabase.from('contas').select('*').order('id', { ascending: false }),
        supabase.from('movimentacoes').select('*').order('data', { ascending: false }).order('id', { ascending: false }),
      ]);
      if (resTrades.data) setTrades(resTrades.data);
      if (resContas.data) {
        setContas(resContas.data);
        if (resContas.data.length > 0 && !contaId) setContaId(String(resContas.data[0].id));
      }
      if (resMov.data) setMovimentacoes(resMov.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  // Atualiza o tipo de conta (Exame/Real) automaticamente ao trocar a conta no formulário
  useEffect(() => {
    if (contaId && contaId !== 'Geral') {
      const c = contas.find(acc => String(acc.id) === String(contaId));
      if (c) setTipoContaTrade(c.tipo === 'Teste' ? 'Exame' : 'Real');
    }
  }, [contaId, contas]);

  const uploadImagem = async (file: File, pasta: string): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop();
      const nome = `${pasta}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('imagens_trades').upload(nome, file);
      if (error) return null;
      return supabase.storage.from('imagens_trades').getPublicUrl(nome).data.publicUrl;
    } catch { return null; }
  };

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pnl) return;
    setSaving(true);
    const fotoUrl = fotoTrade ? await uploadImagem(fotoTrade, 'charts') : null;
    const valorPnl = parseFloat(pnl);
    let pnlBruto = resultado === 'SL' ? -Math.abs(valorPnl) : resultado === 'BE' ? 0 : Math.abs(valorPnl);

    const payload = {
      data: dataTrade, sessao, conta_id: contaId || 'Geral', tipo_conta: tipoContaTrade, ativo: 'MNQ!', direcao, resultado,
      pnl: pnlBruto, duracao: duracaoValor ? `${duracaoValor} ${duracaoUnidade}` : '-',
      seguiu_plano: seguiuPlano, emocao, comentarios
    };
    const finalPayload = fotoUrl ? { ...payload, foto_url: fotoUrl } : payload;

    if (editingTradeId) {
      await supabase.from('trades').update(finalPayload).eq('id', editingTradeId);
      setEditingTradeId(null);
    } else {
      await supabase.from('trades').insert([finalPayload]);
    }

    setPnl(''); setComentarios(''); setFotoTrade(null); setDuracaoValor('');
    await carregarDados();
    setSaving(false);
  };

  const carregarTradeParaEdicao = (t: Trade) => {
    setEditingTradeId(t.id);
    setDataTrade(t.data);
    setSessao(t.sessao || 'NY');
    setContaId(t.conta_id || 'Geral');
    setTipoContaTrade(t.tipo_conta || 'Exame');
    setDirecao(t.direcao);
    setResultado(t.resultado);
    setPnl(String(Math.abs(t.pnl)));
    setSeguiuPlano(t.seguiu_plano);
    setEmocao(t.emocao || 'Tranquilo');
    setComentarios(t.comentarios || '');
    
    if (t.duracao && t.duracao !== '-') {
      const parts = t.duracao.split(' ');
      setDuracaoValor(parts[0] || '');
      setDuracaoUnidade((parts[1] as any) || 'min');
    } else {
      setDuracaoValor('');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicaoTrade = () => {
    setEditingTradeId(null);
    setPnl(''); setComentarios(''); setDuracaoValor('');
  };

  const handleAddConta = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('contas').insert([{ nome: nomeConta, tipo: tipoConta, tamanho: tamanhoConta, numero: numeroConta, status: 'Em andamento' }]);
    setNomeConta(''); setNumeroConta(''); carregarDados();
    setSaving(false);
  };

  const salvarEdicaoConta = async (id: number) => {
    await supabase.from('contas').update(editContaData).eq('id', id);
    setEditContaId(null);
    carregarDados();
  };

  const handleAddMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const url = (tipoMov === 'Retiro' && fotoComprovante) ? await uploadImagem(fotoComprovante, 'retiros') : null;
    await supabase.from('movimentacoes').insert([{ empresa: empresaMov, tipo: tipoMov, valor: Math.abs(parseFloat(valorMov)), data: dataMov, comprovante_url: url }]);
    setEmpresaMov(''); setValorMov(''); setFotoComprovante(null); carregarDados();
    setSaving(false);
  };

  const handleDelete = async (tabela: string, id: number) => {
    if (!confirm('Excluir este registro?')) return;
    await supabase.from(tabela).delete().eq('id', id);
    carregarDados();
  };

  const getEmpresaColor = (texto: string) => {
    const nome = texto.toLowerCase();
    if (nome.includes('lucid')) return 'text-orange-400';
    if (nome.includes('fundednext') || nome.includes('funded next')) return 'text-blue-400';
    if (nome.includes('topstep')) return 'text-rose-400';
    if (nome.includes('tradefy')) return 'text-emerald-400';
    if (nome.includes('apex')) return 'text-green-400';
    return 'text-zinc-300';
  };

  const changeDate = (days: number) => {
    const d = new Date(dataTrade);
    d.setDate(d.getDate() + days);
    setDataTrade(d.toISOString().split('T')[0]);
  };

  const tradesFiltrados = useMemo(() => {
    const hoje = new Date(); hoje.setHours(23, 59, 59, 999);
    let filtrados = trades.filter((t) => {
      if (contaFiltro !== 'todas' && String(t.conta_id) !== contaFiltro) return false;
      const dataT = new Date(t.data + 'T12:00:00');
      
      if (periodoFiltro === 'custom') {
        if (dataInicioFiltro && dataT < new Date(dataInicioFiltro + 'T00:00:00')) return false;
        if (dataFimFiltro && dataT > new Date(dataFimFiltro + 'T23:59:59')) return false;
        return true;
      }
      
      const diffDias = (hoje.getTime() - dataT.getTime()) / (1000 * 3600 * 24);
      if (periodoFiltro === 'semana') {
        const inicioSemana = new Date(hoje); inicioSemana.setDate(hoje.getDate() - hoje.getDay()); inicioSemana.setHours(0, 0, 0, 0);
        return dataT >= inicioSemana;
      }
      if (periodoFiltro === '15d') return diffDias <= 15;
      if (periodoFiltro === '30d') return diffDias <= 30;
      if (periodoFiltro === '60d') return diffDias <= 60;
      if (periodoFiltro === '3m') return diffDias <= 90;
      if (periodoFiltro === '6m') return diffDias <= 180;
      if (periodoFiltro === '12m') return diffDias <= 365;
      return true;
    });

    filtrados.sort((a, b) => {
      if (ordenacao === 'data_desc') return new Date(b.data).getTime() - new Date(a.data).getTime();
      if (ordenacao === 'data_asc') return new Date(a.data).getTime() - new Date(b.data).getTime();
      if (ordenacao === 'pnl_desc') return b.pnl - a.pnl;
      if (ordenacao === 'pnl_asc') return a.pnl - b.pnl;
      return 0;
    });

    return filtrados;
  }, [trades, periodoFiltro, contaFiltro, ordenacao, dataInicioFiltro, dataFimFiltro]);

  const tamanhoContaFiltro = useMemo(() => {
    if (contaFiltro === 'todas') return 50000;
    const c = contas.find(x => String(x.id) === contaFiltro);
    if (!c || !c.tamanho) return 50000;
    const size = parseInt(c.tamanho.replace('K', '000'));
    return isNaN(size) ? 50000 : size;
  }, [contaFiltro, contas]);

  const metricas = useMemo(() => {
    const total = tradesFiltrados.length;
    if (total === 0) {
      return { pnlTotal: 0, winRate: 0, profitFactor: '0.00', rrMedio: '0.00', planoRespeitado: 0, emocionalPredominante: { label: '-', emoji: '' }, maxWinStreak: 0, maxLossStreak: 0, total };
    }

    let pnlTotal = 0, wins = 0, grossProfit = 0, grossLoss = 0, lossCount = 0, seguiuPlanoCount = 0;
    const emocaoCount: Record<string, number> = {};
    let currentWin = 0, maxWinStreak = 0, currentLoss = 0, maxLossStreak = 0;

    const cronologico = [...tradesFiltrados].sort((a,b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    cronologico.forEach((t) => {
      pnlTotal += Number(t.pnl);
      if (t.resultado === 'TP') {
        wins++; grossProfit += Math.abs(Number(t.pnl));
        currentWin++; currentLoss = 0;
        if (currentWin > maxWinStreak) maxWinStreak = currentWin;
      } else if (t.resultado === 'SL') {
        lossCount++; grossLoss += Math.abs(Number(t.pnl));
        currentLoss++; currentWin = 0;
        if (currentLoss > maxLossStreak) maxLossStreak = currentLoss;
      }

      if (t.seguiu_plano) seguiuPlanoCount++;
      if (t.emocao) emocaoCount[t.emocao] = (emocaoCount[t.emocao] || 0) + 1;
    });

    const winRate = (wins / total) * 100;
    const planoRespeitado = (seguiuPlanoCount / total) * 100;
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 'Max' : '0.00') : (grossProfit / grossLoss).toFixed(2);
    
    const avgWin = wins > 0 ? grossProfit / wins : 0;
    const avgLoss = lossCount > 0 ? grossLoss / lossCount : 0;
    const rrMedio = avgLoss === 0 ? (avgWin > 0 ? 'Max' : '0.00') : (avgWin / avgLoss).toFixed(2);

    let topEmocao = '-', maxEmocaoCount = 0;
    Object.entries(emocaoCount).forEach(([emo, count]) => {
      if (count > maxEmocaoCount) { maxEmocaoCount = count; topEmocao = emo; }
    });
    const emocaoObj = EMOCOES.find((e) => e.label === topEmocao) || { label: topEmocao, emoji: '' };

    return { pnlTotal, winRate, profitFactor, rrMedio, planoRespeitado, emocionalPredominante: emocaoObj, maxWinStreak, maxLossStreak, total };
  }, [tradesFiltrados]);

  const formatarValor = (valor: number, forceDollar = false) => {
    if (mostrarPorcentagem && !forceDollar) {
      return `${((Math.abs(valor) / tamanhoContaFiltro) * 100).toFixed(2)}%`;
    }
    return `$${Math.abs(valor).toFixed(2)}`;
  };

  const corVerde = 'text-emerald-400';
  const corVermelha = 'text-rose-400';
  const corBgVerde = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
  const corBgVermelho = 'bg-rose-500/10 border-rose-500/20 text-rose-400';

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans text-xs selection:bg-emerald-400 selection:text-black">
      <header className="border-b border-zinc-900 bg-[#0a0a0a]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-black border border-zinc-700 flex items-center justify-center shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                MNQ! <span className="text-zinc-400 font-medium">JOURNAL</span>
              </h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Cloud Sync
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#111111] p-1 rounded-xl border border-zinc-800/80">
            <button onClick={() => setActiveTab('operacoes')} className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center gap-2 ${activeTab === 'operacoes' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>
              <BarChart3 className="w-4 h-4" /> Entradas
            </button>
            <button onClick={() => setActiveTab('mesas')} className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center gap-2 ${activeTab === 'mesas' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>
              <Wallet className="w-4 h-4" /> Mesas
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center py-20 text-zinc-500"><RefreshCw className="w-8 h-8 animate-spin" /></div>
        ) : activeTab === 'operacoes' ? (
          <>
            {/* NOVO TRADE OU EDIÇÃO */}
            <section className={`border rounded-2xl p-5 transition-all ${editingTradeId ? 'bg-zinc-900 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-[#0d0d0d] border-zinc-800/80'}`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  {editingTradeId ? <Edit3 className="w-4 h-4 text-emerald-400" /> : <PlusCircle className="w-4 h-4" />} 
                  {editingTradeId ? 'Editando Operação Salva' : 'Nova Entrada'} — <span className="text-emerald-400">MNQ!</span>
                </h2>
                {editingTradeId && (
                  <button onClick={cancelarEdicaoTrade} className="text-zinc-400 hover:text-white flex items-center gap-1 bg-black px-2 py-1 rounded border border-zinc-700">
                    <X className="w-3.5 h-3.5" /> Cancelar Edição
                  </button>
                )}
              </div>
              
              <form onSubmit={handleAddTrade} className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">DATA</label>
                    <div className="flex items-center gap-1">
                      <input type="date" value={dataTrade} onChange={(e) => setDataTrade(e.target.value)} className="w-full bg-[#141414] border border-
