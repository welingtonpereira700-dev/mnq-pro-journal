import { useState, useEffect, useMemo, type FormEvent } from 'react';
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

  const handleAddTrade = async (e: FormEvent) => {
    e.preventDefault();
    if (!pnl) return;
    setSaving(true);
    const fotoUrl = fotoTrade ? await uploadImagem(fotoTrade, 'charts') : null;
    const valorPnl = parseFloat(pnl);
    const pnlBruto = resultado === 'SL' ? -Math.abs(valorPnl) : resultado === 'BE' ? 0 : Math.abs(valorPnl);

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
      setDuracaoUnidade((parts[1] as 'min' | 'H') || 'min');
    } else {
      setDuracaoValor('');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicaoTrade = () => {
    setEditingTradeId(null);
    setPnl(''); setComentarios(''); setDuracaoValor('');
  };

  const handleAddConta = async (e: FormEvent) => {
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

  const handleAddMovimentacao = async (e: FormEvent) => {
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

  const changeDate = (days: number) => {
    const d = new Date(dataTrade);
    d.setDate(d.getDate() + days);
    setDataTrade(d.toISOString().split('T')[0]);
  };

  const tradesFiltrados = useMemo(() => {
    const hoje = new Date(); hoje.setHours(23, 59, 59, 999);
    const filtrados = trades.filter((t) => {
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

  const resumoMesas = useMemo(() => {
    const totalCustos = movimentacoes.filter(m => m.tipo === 'Custo').reduce((acc, m) => acc + Number(m.valor), 0);
    const totalRetiros = movimentacoes.filter(m => m.tipo === 'Retiro').reduce((acc, m) => acc + Number(m.valor), 0);
    const lucroLiquido = totalRetiros - totalCustos;
    const roi = totalCustos > 0 ? ((totalRetiros - totalCustos) / totalCustos) * 100 : totalRetiros > 0 ? 100 : 0;
    return { totalCustos, totalRetiros, lucroLiquido, roi };
  }, [movimentacoes]);

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
                      <input type="date" value={dataTrade} onChange={(e) => setDataTrade(e.target.value)} className="w-full bg-[#141414] border border-zinc-800 rounded-lg px-2 py-1.5 text-white" required />
                      <div className="flex flex-col gap-0.5">
                        <button type="button" onClick={() => changeDate(1)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded px-1"><ChevronUp className="w-3 h-3"/></button>
                        <button type="button" onClick={() => changeDate(-1)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded px-1"><ChevronDown className="w-3 h-3"/></button>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">CONTA</label>
                    <select value={contaId} onChange={(e) => setContaId(e.target.value)} className="w-full bg-[#141414] border border-zinc-800 rounded-lg px-2 py-1.5 text-white">
                      <option value="Geral">Geral</option>
                      {contas.filter(c => c.status !== 'Reprovada').map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">TIPO (TRADE)</label>
                    <select value={tipoContaTrade} onChange={(e) => setTipoContaTrade(e.target.value)} className="w-full bg-[#141414] border border-zinc-800 rounded-lg px-2 py-1.5 text-white font-bold">
                      <option value="Exame">Exame</option><option value="Real">Real</option>
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">DIREÇÃO</label>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setDirecao('Buy')} className={`flex-1 py-1.5 rounded-lg border font-bold ${direcao === 'Buy' ? corBgVerde : 'bg-[#141414] border-zinc-800 text-zinc-500'}`}>Buy</button>
                      <button type="button" onClick={() => setDirecao('Sell')} className={`flex-1 py-1.5 rounded-lg border font-bold ${direcao === 'Sell' ? corBgVermelho : 'bg-[#141414] border-zinc-800 text-zinc-500'}`}>Sell</button>
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-2">
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">RESULTADO</label>
                    <div className="flex gap-1">
                      {(['TP', 'SL', 'BE'] as const).map(r => (
                        <button key={r} type="button" onClick={() => setResultado(r)} className={`flex-1 py-1.5 rounded-lg border font-bold ${resultado === r ? (r==='TP'?corBgVerde:r==='SL'?corBgVermelho:'bg-zinc-700 text-white border-zinc-600') : 'bg-[#141414] border-zinc-800 text-zinc-500'}`}>{r}</button>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">VALOR P&L ($)</label>
                    <input type="number" step="0.01" value={pnl} onChange={(e) => setPnl(e.target.value)} placeholder="0.00" className="w-full bg-[#141414] border border-zinc-800 rounded-lg px-2 py-1.5 text-white" required />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">DURAÇÃO</label>
                    <div className="flex gap-1">
                      <input type="number" placeholder="15" value={duracaoValor} onChange={(e) => setDuracaoValor(e.target.value)} className="w-full bg-[#141414] border border-zinc-800 rounded-lg px-2 py-1.5 text-white" />
                      <select value={duracaoUnidade} onChange={(e) => setDuracaoUnidade(e.target.value as 'min' | 'H')} className="bg-[#141414] border border-zinc-800 rounded-lg px-1 py-1.5 text-zinc-300">
                        <option value="min">m</option><option value="H">H</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                  <div className="lg:col-span-6">
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 uppercase">Como se sentiu?</label>
                    <div className="flex flex-wrap gap-2">
                      {EMOCOES.map(item => (
                        <button key={item.label} type="button" onClick={() => setEmocao(item.label)} className={`px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 border transition-all ${emocao === item.label ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-[#141414] border-zinc-800 text-zinc-500'}`}>
                          <span>{item.emoji}</span> <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="lg:col-span-3">
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 uppercase">Plano Respeitado?</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setSeguiuPlano(true)} className={`flex-1 py-1.5 rounded-lg border font-bold flex justify-center items-center gap-1 ${seguiuPlano ? corBgVerde : 'bg-[#141414] border-zinc-800 text-zinc-500'}`}><CheckCircle2 className="w-3.5 h-3.5"/> Sim</button>
                      <button type="button" onClick={() => setSeguiuPlano(false)} className={`flex-1 py-1.5 rounded-lg border font-bold flex justify-center items-center gap-1 ${!seguiuPlano ? corBgVermelho : 'bg-[#141414] border-zinc-800 text-zinc-500'}`}><XCircle className="w-3.5 h-3.5"/> Não</button>
                    </div>
                  </div>
                  <div className="lg:col-span-3">
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 uppercase">Print Gráfico</label>
                    <label className="flex items-center justify-center gap-2 bg-[#141414] border border-dashed border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-400 cursor-pointer hover:bg-zinc-900">
                      <Upload className="w-3.5 h-3.5" /> <span className="truncate">{fotoTrade ? fotoTrade.name : 'Anexar'}</span>
                      <input type="file" accept="image/*" onChange={(e) => setFotoTrade(e.target.files?.[0] || null)} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <input type="text" placeholder="Observações e comentários..." value={comentarios} onChange={(e) => setComentarios(e.target.value)} className="flex-1 bg-[#141414] border border-zinc-800 rounded-lg px-3 py-2 text-white" />
                  <button type="submit" disabled={saving} className={`font-bold px-6 py-2 rounded-lg flex items-center gap-2 ${editingTradeId ? 'bg-blue-500 hover:bg-blue-400 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-black'}`}>
                    {saving ? '...' : editingTradeId ? <><Save className="w-4 h-4"/> Atualizar Trade</> : '+ Salvar'}
                  </button>
                </div>
              </form>
            </section>

            <section className="space-y-4">
              <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="w-4 h-4 text-zinc-500" />
                  {[ {id:'semana', l:'Semana'}, {id:'15d', l:'Últ. 15 dias'}, {id:'30d', l:'Últ. 30 dias'}, {id:'60d', l:'60 Dias'}, {id:'3m', l:'3 Meses'}, {id:'custom', l:'Personalizado'} ].map(p => (
                    <button key={p.id} onClick={() => setPeriodoFiltro(p.id)} className={`px-3 py-1.5 rounded-lg font-bold transition-all ${periodoFiltro === p.id ? 'bg-emerald-500 text-black' : 'text-zinc-500 hover:text-white'}`}>{p.l}</button>
                  ))}
                  {periodoFiltro === 'custom' && (
                    <div className="flex items-center gap-1 ml-2">
                      <input type="date" value={dataInicioFiltro} onChange={e=>setDataInicioFiltro(e.target.value)} className="bg-[#141414] border border-zinc-800 rounded text-[10px] p-1 text-white" />
                      <span className="text-zinc-500">até</span>
                      <input type="date" value={dataFimFiltro} onChange={e=>setDataFimFiltro(e.target.value)} className="bg-[#141414] border border-zinc-800 rounded text-[10px] p-1 text-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-black border border-zinc-800 rounded-lg overflow-hidden p-0.5">
                    <button onClick={() => setMostrarPorcentagem(false)} className={`px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1 ${!mostrarPorcentagem ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}><DollarSign className="w-3 h-3"/> USD</button>
                    <button onClick={() => setMostrarPorcentagem(true)} className={`px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1 ${mostrarPorcentagem ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}><Percent className="w-3 h-3"/> %</button>
                  </div>
                  <select value={contaFiltro} onChange={(e) => setContaFiltro(e.target.value)} className="bg-[#141414] border border-zinc-800 rounded-lg px-3 py-1.5 text-white font-bold">
                    <option value="todas">Todas as Contas</option>
                    {contas.map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.tamanho})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-xl p-4 text-center">
                  <span className="text-[10px] font-bold uppercase text-zinc-500">P&L PERÍODO</span>
                  <p className={`text-2xl font-black mt-1 ${metricas.pnlTotal >= 0 ? corVerde : corVermelha}`}>
                    {metricas.pnlTotal >= 0 ? '+' : '-'}{formatarValor(metricas.pnlTotal)}
                  </p>
                </div>
                <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-xl p-4 text-center">
                  <span className="text-[10px] font-bold uppercase text-zinc-500">WIN RATE</span>
                  <p className="text-2xl font-black text-white mt-1">{metricas.winRate.toFixed(1)}%</p>
                </div>
                <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-xl p-4 text-center">
                  <span className="text-[10px] font-bold uppercase text-zinc-500">PROFIT FACTOR</span>
                  <p className={`text-2xl font-black mt-1 ${corVerde}`}>{metricas.profitFactor}</p>
                </div>
                <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-xl p-4 text-center">
                  <span className="text-[10px] font-bold uppercase text-zinc-500">RR MÉDIO</span>
                  <p className="text-2xl font-black text-white mt-1">{metricas.rrMedio}</p>
                </div>
                <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-xl p-4 text-center">
                  <span className="text-[10px] font-bold uppercase text-zinc-500">TOTAL TRADES</span>
                  <p className="text-2xl font-black text-white mt-1">{metricas.total}</p>
                </div>
                <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-xl p-4 text-center lg:col-span-2">
                  <span className="text-[10px] font-bold uppercase text-zinc-500">EMOCIONAL PREDOMINANTE</span>
                  <div className="mt-2 flex justify-center">
                    <span className="px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-sm font-bold text-white flex items-center gap-2">
                      <span>{metricas.emocionalPredominante.emoji}</span> <span>{metricas.emocionalPredominante.label}</span>
                    </span>
                  </div>
                </div>
                <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-xl p-4 text-center">
                  <span className="text-[10px] font-bold uppercase text-zinc-500">PLANO RESPEITADO</span>
                  <p className={`text-xl font-black mt-1 ${corVerde}`}>{metricas.planoRespeitado.toFixed(1)}%</p>
                </div>
                <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-xl p-4 text-center">
                  <span className="text-[10px] font-bold uppercase text-zinc-500">MAX WINS</span>
                  <p className={`text-xl font-black mt-1 ${corVerde}`}>{metricas.maxWinStreak}</p>
                </div>
                <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-xl p-4 text-center">
                  <span className="text-[10px] font-bold uppercase text-zinc-500">MAX LOSS</span>
                  <p className={`text-xl font-black mt-1 ${corVermelha}`}>{metricas.maxLossStreak}</p>
                </div>
              </div>

              <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-xl p-4">
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-2">NOTAS DO PERÍODO</label>
                <textarea rows={2} value={notasPeriodo} onChange={(e) => setNotasPeriodo(e.target.value)} placeholder="Escreva seus aprendizados, erros e plano de ação..." className="w-full bg-[#111] border border-zinc-800 rounded-lg p-3 text-zinc-300" />
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-zinc-500 uppercase">Histórico</h3>
                <div className="flex gap-2">
                  <button onClick={() => setOrdenacao(ordenacao === 'data_desc' ? 'data_asc' : 'data_desc')} className="text-[10px] bg-zinc-900 px-2 py-1 rounded text-zinc-400 hover:text-white flex items-center">Data {ordenacao === 'data_desc' ? <ChevronDown className="w-3 h-3"/> : <ChevronUp className="w-3 h-3"/>}</button>
                  <button onClick={() => setOrdenacao(ordenacao === 'pnl_desc' ? 'pnl_asc' : 'pnl_desc')} className="text-[10px] bg-zinc-900 px-2 py-1 rounded text-zinc-400 hover:text-white flex items-center">P&L {ordenacao === 'pnl_desc' ? <ChevronDown className="w-3 h-3"/> : <ChevronUp className="w-3 h-3"/>}</button>
                </div>
              </div>

              <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#111111] text-zinc-500 uppercase">
                    <tr>
                      <th className="py-2 px-3">Data</th>
                      <th className="py-2 px-3">Conta / Mesa</th>
                      <th className="py-2 px-3">Direção</th>
                      <th className="py-2 px-3">Resultado</th>
                      <th className="py-2 px-3">P&L</th>
                      <th className="py-2 px-3">Duração</th>
                      <th className="py-2 px-3">Plano</th>
                      <th className="py-2 px-3">Emoção</th>
                      <th className="py-2 px-3">Ações / Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {tradesFiltrados.map((t) => {
                      const c = contas.find(x => String(x.id) === String(t.conta_id));
                      const emo = EMOCOES.find(e => e.label === t.emocao);
                      const isEditing = editingTradeId === t.id;
                      
                      return (
                        <tr key={t.id} className={`hover:bg-zinc-900/30 ${isEditing ? 'bg-zinc-900/80 border-l-2 border-emerald-500' : ''}`}>
                          <td className="py-2 px-3 text-zinc-300 font-medium">{t.data} <span className="text-zinc-600 text-[9px] block">{t.sessao}</span></td>
                          <td className="py-2 px-3">
                            <span className="text-zinc-300 font-bold block">{c ? c.nome : 'Geral'}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${t.tipo_conta === 'Real' ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-800 text-zinc-400'}`}>{t.tipo_conta || 'Exame'}</span>
                          </td>
                          <td className={`py-2 px-3 font-bold ${t.direcao === 'Buy' ? corVerde : corVermelha}`}>{t.direcao}</td>
                          <td className="py-2 px-3"><span className={`px-1.5 py-0.5 rounded font-bold ${t.resultado==='TP'?corBgVerde:t.resultado==='SL'?corBgVermelho:'bg-zinc-800 text-zinc-300'}`}>{t.resultado}</span></td>
                          <td className={`py-2 px-3 font-black text-sm ${t.pnl > 0 ? corVerde : t.pnl < 0 ? corVermelha : 'text-zinc-400'}`}>
                            {t.pnl > 0 ? '+' : '-'}{formatarValor(t.pnl)}
                          </td>
                          <td className="py-2 px-3 text-zinc-400 whitespace-nowrap"><Clock className="w-3 h-3 inline mr-1" />{t.duracao}</td>
                          <td className="py-2 px-3">{t.seguiu_plano ? <span className={`font-bold ${corVerde}`}>Sim</span> : <span className={`font-bold ${corVermelha}`}>Não</span>}</td>
                          <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] whitespace-nowrap">{emo?.emoji} {t.emocao}</span></td>
                          <td className="py-2 px-3 flex items-center gap-3">
                            <button onClick={() => carregarTradeParaEdicao(t)} className="text-zinc-500 hover:text-blue-400" title="Editar Operação"><Edit3 className="w-4 h-4"/></button>
                            {t.comentarios && <button onClick={() => setModal({tipo:'texto', titulo: 'Comentários do Trade', conteudo: t.comentarios})} className="text-zinc-400 hover:text-white" title="Ler Comentários"><MessageSquare className="w-4 h-4" /></button>}
                            {t.foto_url && <button onClick={() => setModal({tipo:'imagem', conteudo: t.foto_url!})} className="text-emerald-400 hover:underline inline-flex items-center gap-1" title="Ver Print"><ImageIcon className="w-3.5 h-3.5" /></button>}
                            <button onClick={() => handleDelete('trades', t.id)} className="text-zinc-600 hover:text-rose-400" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-xl p-4">
                <span className="text-[10px] font-bold uppercase text-zinc-500">CUSTOS (EXAMES)</span>
                <p className={`text-2xl font-black mt-1 ${corVermelha}`}>-${resumoMesas.totalCustos.toFixed(2)}</p>
              </div>
              <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-xl p-4">
                <span className="text-[10px] font-bold uppercase text-zinc-500">TOTAL RETIROS (SAQUES)</span>
                <p className={`text-2xl font-black mt-1 ${corVerde}`}>+${resumoMesas.totalRetiros.toFixed(2)}</p>
              </div>
              <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-xl p-4">
                <span className="text-[10px] font-bold uppercase text-zinc-500">LUCRO LÍQUIDO REAL</span>
                <p className={`text-2xl font-black mt-1 ${resumoMesas.lucroLiquido >= 0 ? corVerde : corVermelha}`}>
                  {resumoMesas.lucroLiquido >= 0 ? '+$' : '-$'}{Math.abs(resumoMesas.lucroLiquido).toFixed(2)}
                </p>
              </div>
              <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-xl p-4">
                <span className="text-[10px] font-bold uppercase text-zinc-500">ROI SOBRE MESAS</span>
                <p className={`text-2xl font-black mt-1 ${resumoMesas.roi >= 0 ? corVerde : corVermelha}`}>
                  {resumoMesas.roi.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><Award className="w-4 h-4" /> Gestão de Contas</h3>
                <form onSubmit={handleAddConta} className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Nome da Empresa/Mesa" value={nomeConta} onChange={(e) => setNomeConta(e.target.value)} className="col-span-2 bg-[#141414] border border-zinc-800 rounded-lg px-3 py-2 text-white" required />
                  <select value={tamanhoConta} onChange={(e) => setTamanhoConta(e.target.value)} className="bg-[#141414] border border-zinc-800 rounded-lg px-3 py-2 text-white">
                    {['10K','25K','50K','100K','150K','250K'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={tipoConta} onChange={(e) => setTipoConta(e.target.value as 'Teste' | 'Real')} className="bg-[#141414] border border-zinc-800 rounded-lg px-3 py-2 text-white">
                    <option value="Teste">Teste (Exame)</option><option value="Real">Real (Funded)</option>
                  </select>
                  <input type="text" placeholder="Nº da Conta" value={numeroConta} onChange={(e) => setNumeroConta(e.target.value)} className="col-span-2 bg-[#141414] border border-zinc-800 rounded-lg px-3 py-2 text-white" />
                  <button type="submit" disabled={saving} className="col-span-2 bg-white text-black font-bold rounded-lg px-3 py-2 hover:bg-zinc-200 transition-colors">+ Adicionar Conta</button>
                </form>

                <div className="space-y-2 mt-4">
                  {contas.map(c => (
                    <div key={c.id} className="bg-[#111] border border-zinc-800 rounded-xl p-3">
                      {editContaId === c.id ? (
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" value={editContaData.nome || ''} onChange={e=>setEditContaData({...editContaData, nome: e.target.value})} className="col-span-2 bg-black border border-zinc-700 rounded p-1 text-white" />
                          <select value={editContaData.tamanho || ''} onChange={e=>setEditContaData({...editContaData, tamanho: e.target.value})} className="bg-black border border-zinc-700 rounded p-1 text-white">
                            {['10K','25K','50K','100K','150K','250K'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <select value={editContaData.tipo || ''} onChange={e=>setEditContaData({...editContaData, tipo: e.target.value as 'Teste' | 'Real'})} className="bg-black border border-zinc-700 rounded p-1 text-white">
                            <option value="Teste">Teste</option><option value="Real">Real</option>
                          </select>
                          <input type="text" value={editContaData.numero || ''} onChange={e=>setEditContaData({...editContaData, numero: e.target.value})} className="col-span-2 bg-black border border-zinc-700 rounded p-1 text-white" />
                          <select value={editContaData.status || ''} onChange={e=>setEditContaData({...editContaData, status: e.target.value as 'Em andamento' | 'Aprovada' | 'Reprovada'})} className="col-span-2 bg-black border border-zinc-700 rounded p-1 text-white">
                            <option value="Em andamento">Em andamento</option><option value="Aprovada">Aprovada</option><option value="Reprovada">Reprovada</option>
                          </select>
                          <button onClick={() => salvarEdicaoConta(c.id)} className="col-span-2 bg-white text-black font-bold rounded py-1 flex justify-center items-center gap-1 hover:bg-zinc-200"><Save className="w-3 h-3"/> Salvar</button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-sm flex items-center gap-2 text-white">{c.nome} <span className="text-zinc-400 text-[10px] bg-black px-1.5 py-0.5 rounded border border-zinc-800">{c.tamanho}</span></h4>
                            <p className="text-[10px] text-zinc-500 mt-1">{c.numero || 'Sem número'} • {c.tipo}</p>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold ${c.status==='Aprovada'?corBgVerde:c.status==='Reprovada'?corBgVermelho:'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>{c.status}</span>
                          </div>
                          <div className="flex gap-3">
                            <button onClick={() => {setEditContaId(c.id); setEditContaData(c);}} className="text-zinc-500 hover:text-white"><Edit3 className="w-4 h-4"/></button>
                            <button onClick={() => handleDelete('contas', c.id)} className="text-zinc-600 hover:text-rose-400"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><Wallet className="w-4 h-4" /> Registrar Custo ou Saque</h3>
                <form onSubmit={handleAddMovimentacao} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setTipoMov('Custo')} className={`py-1.5 rounded-lg border font-bold ${tipoMov === 'Custo' ? corBgVermelho : 'bg-[#141414] border-zinc-800 text-zinc-500'}`}>Custo (Taxa)</button>
                    <button type="button" onClick={() => setTipoMov('Retiro')} className={`py-1.5 rounded-lg border font-bold ${tipoMov === 'Retiro' ? corBgVerde : 'bg-[#141414] border-zinc-800 text-zinc-500'}`}>Retiro (Saque)</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" placeholder="Empresa" value={empresaMov} onChange={e=>setEmpresaMov(e.target.value)} className="bg-[#141414] border border-zinc-800 rounded-lg px-2 py-1.5 text-white" required />
                    <input type="number" step="0.01" placeholder="Valor $" value={valorMov} onChange={e=>setValorMov(e.target.value)} className="bg-[#141414] border border-zinc-800 rounded-lg px-2 py-1.5 text-white" required />
                    <input type="date" value={dataMov} onChange={e=>setDataMov(e.target.value)} className="bg-[#141414] border border-zinc-800 rounded-lg px-2 py-1.5 text-white" required />
                  </div>
                  {tipoMov === 'Retiro' && (
                    <label className="flex items-center justify-center gap-2 w-full bg-[#141414] border border-dashed border-zinc-700 rounded-lg px-3 py-2 text-zinc-400 cursor-pointer hover:bg-zinc-900">
                      <Upload className="w-3.5 h-3.5" /> <span className="truncate">{fotoComprovante ? fotoComprovante.name : 'Anexar Print'}</span>
                      <input type="file" accept="image/*" onChange={(e) => setFotoComprovante(e.target.files?.[0] || null)} className="hidden" />
                    </label>
                  )}
                  <button type="submit" disabled={saving} className="w-full bg-white text-black font-bold py-2 rounded-lg hover:bg-zinc-200 transition-colors">Salvar</button>
                </form>

                <div className="mt-4 space-y-2">
                  {movimentacoes.map(m => (
                    <div key={m.id} className="flex items-center justify-between bg-[#111] border border-zinc-800/50 p-2.5 rounded-lg">
                      <div>
                        <span className="font-bold text-white">{m.empresa}</span>
                        <span className="text-zinc-500 font-normal text-[9px] ml-2 block">{m.data}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {m.comprovante_url && <button onClick={() => setModal({tipo:'imagem', conteudo: m.comprovante_url!})} className="text-emerald-400 hover:underline flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5"/> Print</button>}
                        <span className={`font-black ${m.tipo === 'Retiro' ? corVerde : corVermelha}`}>
                          {m.tipo==='Retiro'?'+':'-'}${m.valor.toFixed(2)}
                        </span>
                        <button onClick={() => handleDelete('movimentacoes', m.id)} className="text-zinc-600 hover:text-rose-400"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {modal && (
        <div onClick={() => setModal(null)} className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-[#111] border border-zinc-800 rounded-2xl p-4" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold">{modal.titulo || 'Visualização'}</h3>
              <button onClick={() => setModal(null)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {modal.tipo === 'imagem' ? <img src={modal.conteudo} alt="Print" className="w-full max-h-[70vh] object-contain rounded-lg" /> : <p className="text-zinc-300 text-sm whitespace-pre-wrap">{modal.conteudo}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
