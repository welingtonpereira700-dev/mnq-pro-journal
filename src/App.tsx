import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  PlusCircle,
  Wallet,
  BarChart3,
  Trash2,
  Upload,
  CheckCircle2,
  XCircle,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Award,
  Image as ImageIcon,
  X,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { supabase } from './supabaseClient';

interface Trade {
  id: number;
  data: string;
  sessao: string;
  conta_id: string;
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
  { label: 'Con miedo', emoji: '😰' },
  { label: 'Eufórico', emoji: '🤑' },
  { label: 'Frustrado', emoji: '😡' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'operacoes' | 'mesas'>('operacoes');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dados do Supabase
  const [trades, setTrades] = useState<Trade[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);

  // Filtros
  const [periodoFiltro, setPeriodoFiltro] = useState<string>('30d');
  const [contaFiltro, setContaFiltro] = useState<string>('todas');
  const [notasPeriodo, setNotasPeriodo] = useState<string>(() => {
    return localStorage.getItem('trading_notas_periodo') || '';
  });

  // Modal de Imagem
  const [imagemModal, setImagemModal] = useState<string | null>(null);

  // Formulário de Novo Trade
  const [dataTrade, setDataTrade] = useState(new Date().toISOString().split('T')[0]);
  const [sessao, setSessao] = useState('NY');
  const [contaId, setContaId] = useState('');
  const [direcao, setDirecao] = useState<'Buy' | 'Sell'>('Buy');
  const [resultado, setResultado] = useState<'TP' | 'SL' | 'BE'>('TP');
  const [pnl, setPnl] = useState('');
  const [duracaoValor, setDuracaoValor] = useState('');
  const [duracaoUnidade, setDuracaoUnidade] = useState<'min' | 'H'>('min');
  const [seguiuPlano, setSeguiuPlano] = useState(true);
  const [emocao, setEmocao] = useState('Tranquilo');
  const [comentarios, setComentarios] = useState('');
  const [fotoTrade, setFotoTrade] = useState<File | null>(null);

  // Formulário de Nova Conta
  const [nomeConta, setNomeConta] = useState('');
  const [tipoConta, setTipoConta] = useState<'Teste' | 'Real'>('Teste');
  const [statusConta, setStatusConta] = useState<'Em andamento' | 'Aprovada' | 'Reprovada'>('Em andamento');

  // Formulário de Movimentação (Custo / Retiro)
  const [empresaMov, setEmpresaMov] = useState('');
  const [tipoMov, setTipoMov] = useState<'Custo' | 'Retiro'>('Custo');
  const [valorMov, setValorMov] = useState('');
  const [dataMov, setDataMov] = useState(new Date().toISOString().split('T')[0]);
  const [fotoComprovante, setFotoComprovante] = useState<File | null>(null);

  useEffect(() => {
    localStorage.setItem('trading_notas_periodo', notasPeriodo);
  }, [notasPeriodo]);

  // Carregar dados iniciais do Supabase
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
        if (resContas.data.length > 0 && !contaId) {
          setContaId(String(resContas.data[0].id));
        }
      }
      if (resMov.data) setMovimentacoes(resMov.data);
    } catch (error) {
      console.error('Erro ao carregar dados do Supabase:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Upload de Imagem para o Bucket 'imagens_trades'
  const uploadImagem = async (file: File, pasta: string): Promise<string | null> => {
    try {
      const extensao = file.name.split('.').pop();
      const nomeArquivo = `${pasta}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extensao}`;

      const { error: uploadError } = await supabase.storage
        .from('imagens_trades')
        .upload(nomeArquivo, file);

      if (uploadError) {
        alert('Erro ao enviar imagem: ' + uploadError.message);
        return null;
      }

      const { data } = supabase.storage.from('imagens_trades').getPublicUrl(nomeArquivo);
      return data.publicUrl;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  // Salvar Novo Trade
  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pnl) return;
    setSaving(true);

    let fotoUrl = null;
    if (fotoTrade) {
      fotoUrl = await uploadImagem(fotoTrade, 'charts');
    }

    const valorNumerico = parseFloat(pnl);
    const pnlFinal = resultado === 'SL' ? -Math.abs(valorNumerico) : resultado === 'BE' ? 0 : Math.abs(valorNumerico);

    const novoTrade = {
      data: dataTrade,
      sessao,
      conta_id: contaId || 'Geral',
      ativo: 'MNQ!',
      direcao,
      resultado,
      pnl: pnlFinal,
      duracao: duracaoValor ? `${duracaoValor} ${duracaoUnidade}` : '-',
      seguiu_plano: seguiuPlano,
      emocao,
      comentarios,
      foto_url: fotoUrl,
    };

    const { error } = await supabase.from('trades').insert([novoTrade]);

    if (error) {
      alert('Erro ao salvar trade no banco: ' + error.message);
    } else {
      setPnl('');
      setDuracaoValor('');
      setComentarios('');
      setFotoTrade(null);
      await carregarDados();
    }
    setSaving(false);
  };

  // Excluir Trade
  const handleDeleteTrade = async (id: number) => {
    if (!confirm('Deseja excluir esta operação?')) return;
    await supabase.from('trades').delete().eq('id', id);
    await carregarDados();
  };

  // Adicionar Conta
  const handleAddConta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeConta.trim()) return;
    setSaving(true);

    const { error } = await supabase.from('contas').insert([
      { nome: nomeConta, tipo: tipoConta, status: statusConta }
    ]);

    if (error) {
      alert('Erro ao criar conta: ' + error.message);
    } else {
      setNomeConta('');
      await carregarDados();
    }
    setSaving(false);
  };

  // Atualizar Status da Conta
  const handleUpdateContaStatus = async (id: number, novoStatus: 'Em andamento' | 'Aprovada' | 'Reprovada') => {
    await supabase.from('contas').update({ status: novoStatus }).eq('id', id);
    await carregarDados();
  };

  // Excluir Conta
  const handleDeleteConta = async (id: number) => {
    if (!confirm('Excluir esta conta?')) return;
    await supabase.from('contas').delete().eq('id', id);
    await carregarDados();
  };

  // Adicionar Movimentação (Custo ou Retiro)
  const handleAddMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaMov || !valorMov) return;
    setSaving(true);

    let comprovanteUrl = null;
    if (tipoMov === 'Retiro' && fotoComprovante) {
      comprovanteUrl = await uploadImagem(fotoComprovante, 'retiros');
    }

    const { error } = await supabase.from('movimentacoes').insert([
      {
        empresa: empresaMov,
        tipo: tipoMov,
        valor: Math.abs(parseFloat(valorMov)),
        data: dataMov,
        comprovante_url: comprovanteUrl,
      }
    ]);

    if (error) {
      alert('Erro ao registrar movimentação: ' + error.message);
    } else {
      setEmpresaMov('');
      setValorMov('');
      setFotoComprovante(null);
      await carregarDados();
    }
    setSaving(false);
  };

  // Excluir Movimentação
  const handleDeleteMovimentacao = async (id: number) => {
    if (!confirm('Excluir este registro?')) return;
    await supabase.from('movimentacoes').delete().eq('id', id);
    await carregarDados();
  };

  // Filtragem de Trades
  const tradesFiltrados = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    return trades.filter((t) => {
      if (contaFiltro !== 'todas' && String(t.conta_id) !== contaFiltro) {
        return false;
      }

      const dataT = new Date(t.data + 'T12:00:00');
      const diffDias = (hoje.getTime() - dataT.getTime()) / (1000 * 3600 * 24);

      if (periodoFiltro === 'semana') {
        const diaSemana = hoje.getDay();
        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(hoje.getDate() - diaSemana);
        inicioSemana.setHours(0, 0, 0, 0);
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
  }, [trades, periodoFiltro, contaFiltro]);

  // Cálculo de Métricas
  const metricas = useMemo(() => {
    const total = tradesFiltrados.length;
    if (total === 0) {
      return {
        pnlTotal: 0,
        winRate: 0,
        profitFactor: '0.00',
        planoRespeitado: 0,
        emocionalPredominante: { label: '-', emoji: '' },
        maxWinStreak: 0,
        maxLossStreak: 0,
        total,
      };
    }

    let pnlTotal = 0;
    let wins = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let seguiuPlanoCount = 0;
    const emocaoCount: Record<string, number> = {};

    let currentWin = 0;
    let maxWinStreak = 0;
    let currentLoss = 0;
    let maxLossStreak = 0;

    // Ordenar cronologicamente para streaks
    const cronologico = [...tradesFiltrados].reverse();

    cronologico.forEach((t) => {
      pnlTotal += Number(t.pnl);
      if (t.resultado === 'TP') {
        wins++;
        grossProfit += Math.abs(Number(t.pnl));
        currentWin++;
        currentLoss = 0;
        if (currentWin > maxWinStreak) maxWinStreak = currentWin;
      } else if (t.resultado === 'SL') {
        grossLoss += Math.abs(Number(t.pnl));
        currentLoss++;
        currentWin = 0;
        if (currentLoss > maxLossStreak) maxLossStreak = currentLoss;
      }

      if (t.seguiu_plano) seguiuPlanoCount++;
      if (t.emocao) {
        emocaoCount[t.emocao] = (emocaoCount[t.emocao] || 0) + 1;
      }
    });

    const winRate = (wins / total) * 100;
    const planoRespeitado = (seguiuPlanoCount / total) * 100;
    const profitFactor =
      grossLoss === 0 ? (grossProfit > 0 ? 'Max' : '0.00') : (grossProfit / grossLoss).toFixed(2);

    let topEmocao = '-';
    let maxEmocaoCount = 0;
    Object.entries(emocaoCount).forEach(([emo, count]) => {
      if (count > maxEmocaoCount) {
        maxEmocaoCount = count;
        topEmocao = emo;
      }
    });

    const emocaoObj = EMOCOES.find((e) => e.label === topEmocao) || { label: topEmocao, emoji: '' };

    return {
      pnlTotal,
      winRate,
      profitFactor,
      planoRespeitado,
      emocionalPredominante: emocaoObj,
      maxWinStreak,
      maxLossStreak,
      total,
    };
  }, [tradesFiltrados]);

  // Cálculos Financeiros das Mesas (ROI)
  const resumoMesas = useMemo(() => {
    const totalCustos = movimentacoes
      .filter((m) => m.tipo === 'Custo')
      .reduce((acc, m) => acc + Number(m.valor), 0);
    const totalRetiros = movimentacoes
      .filter((m) => m.tipo === 'Retiro')
      .reduce((acc, m) => acc + Number(m.valor), 0);
    const lucroLiquido = totalRetiros - totalCustos;
    const roi = totalCustos > 0 ? ((totalRetiros - totalCustos) / totalCustos) * 100 : totalRetiros > 0 ? 100 : 0;

    return { totalCustos, totalRetiros, lucroLiquido, roi };
  }, [movimentacoes]);

  const getNomeConta = (idStr: string) => {
    const encontrada = contas.find((c) => String(c.id) === String(idStr));
    return encontrada ? `${encontrada.nome} (${encontrada.tipo})` : 'Geral';
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-[#00ff88] selection:text-black">
      {/* Header */}
      <header className="border-b border-zinc-900 bg-[#0a0a0a]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#00ff88]" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                MNQ! <span className="text-[#00ff88]">PRO JOURNAL</span>
              </h1>
              <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse"></span>
                Sincronizado com Supabase Cloud
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#111111] p-1 rounded-xl border border-zinc-800/80">
            <button
              onClick={() => setActiveTab('operacoes')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'operacoes'
                  ? 'bg-[#00ff88] text-black shadow-[0_0_15px_rgba(0,255,136,0.3)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Operações & Métricas
            </button>
            <button
              onClick={() => setActiveTab('mesas')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'mesas'
                  ? 'bg-[#00ff88] text-black shadow-[0_0_15px_rgba(0,255,136,0.3)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              Mesas & ROI
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-3">
            <RefreshCw className="w-8 h-8 text-[#00ff88] animate-spin" />
            <p className="text-sm">Carregando seus dados da nuvem...</p>
          </div>
        ) : activeTab === 'operacoes' ? (
          <>
            {/* Formulário de Nova Entrada */}
            <section className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-[#00ff88]" />
                  Nova Entrada — <span className="text-[#00ff88]">MNQ!</span>
                </h2>
              </div>

              <form onSubmit={handleAddTrade} className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {/* Data */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">DATA</label>
                    <input
                      type="date"
                      value={dataTrade}
                      onChange={(e) => setDataTrade(e.target.value)}
                      className="w-full bg-[#141414] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00ff88]"
                      required
                    />
                  </div>

                  {/* Sessão */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">SESSÃO</label>
                    <select
                      value={sessao}
                      onChange={(e) => setSessao(e.target.value)}
                      className="w-full bg-[#141414] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00ff88]"
                    >
                      <option value="NY">NY</option>
                      <option value="London">London</option>
                      <option value="Asia">Asia</option>
                    </select>
                  </div>

                  {/* Conta */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">CONTA / MESA</label>
                    <select
                      value={contaId}
                      onChange={(e) => setContaId(e.target.value)}
                      className="w-full bg-[#141414] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00ff88]"
                    >
                      <option value="Geral">Geral / Padrão</option>
                      {contas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} ({c.tipo})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Direção */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">DIREÇÃO</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDirecao('Buy')}
                        className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all ${
                          direcao === 'Buy'
                            ? 'bg-[#00ff88]/15 border-[#00ff88] text-[#00ff88]'
                            : 'bg-[#141414] border-zinc-800 text-zinc-500'
                        }`}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" /> Buy
                      </button>
                      <button
                        type="button"
                        onClick={() => setDirecao('Sell')}
                        className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all ${
                          direcao === 'Sell'
                            ? 'bg-red-500/15 border-red-500 text-red-400'
                            : 'bg-[#141414] border-zinc-800 text-zinc-500'
                        }`}
                      >
                        <ArrowDownRight className="w-3.5 h-3.5" /> Sell
                      </button>
                    </div>
                  </div>

                  {/* Resultado */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">RESULTADO</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['TP', 'SL', 'BE'] as const).map((res) => (
                        <button
                          key={res}
                          type="button"
                          onClick={() => setResultado(res)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                            resultado === res
                              ? res === 'TP'
                                ? 'bg-[#00ff88] text-black border-[#00ff88]'
                                : res === 'SL'
                                ? 'bg-red-500 text-white border-red-500'
                                : 'bg-zinc-600 text-white border-zinc-500'
                              : 'bg-[#141414] border-zinc-800 text-zinc-500'
                          }`}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* P&L ($) */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">VALOR P&L ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 450.00"
                      value={pnl}
                      onChange={(e) => setPnl(e.target.value)}
                      className="w-full bg-[#141414] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00ff88]"
                      required
                    />
                  </div>

                  {/* Duração */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">DURAÇÃO</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="15"
                        value={duracaoValor}
                        onChange={(e) => setDuracaoValor(e.target.value)}
                        className="w-full bg-[#141414] border border-zinc-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#00ff88]"
                      />
                      <select
                        value={duracaoUnidade}
                        onChange={(e) => setDuracaoUnidade(e.target.value as 'min' | 'H')}
                        className="bg-[#141414] border border-zinc-800 rounded-xl px-2 py-2 text-xs text-zinc-300 focus:outline-none"
                      >
                        <option value="min">min</option>
                        <option value="H">H</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Linha 2: Emoções, Plano Respeitado e Print */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end pt-1">
                  {/* Emoções */}
                  <div className="lg:col-span-6">
                    <label className="block text-[11px] font-medium text-zinc-400 uppercase mb-1.5">
                      ¿CÓMO TE SENTISTE?
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {EMOCOES.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => setEmocao(item.label)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border transition-all ${
                            emocao === item.label
                              ? 'bg-[#00ff88]/15 border-[#00ff88] text-white shadow-[0_0_10px_rgba(0,255,136,0.2)]'
                              : 'bg-[#161616] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <span>{item.emoji}</span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Plano Respeitado */}
                  <div className="lg:col-span-3">
                    <label className="block text-[11px] font-medium text-zinc-400 uppercase mb-1.5">
                      PLANO RESPEITADO?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSeguiuPlano(true)}
                        className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                          seguiuPlano
                            ? 'bg-[#00ff88]/15 border-[#00ff88] text-[#00ff88]'
                            : 'bg-[#141414] border-zinc-800 text-zinc-500'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setSeguiuPlano(false)}
                        className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                          !seguiuPlano
                            ? 'bg-red-500/15 border-red-500 text-red-400'
                            : 'bg-[#141414] border-zinc-800 text-zinc-500'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Não
                      </button>
                    </div>
                  </div>

                  {/* Upload Print PNG */}
                  <div className="lg:col-span-3">
                    <label className="block text-[11px] font-medium text-zinc-400 uppercase mb-1.5">
                      PRINT DO GRÁFICO (PNG/JPG)
                    </label>
                    <label className="flex items-center justify-center gap-2 w-full bg-[#141414] hover:bg-[#1a1a1a] border border-dashed border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-300 cursor-pointer transition-all">
                      <Upload className="w-3.5 h-3.5 text-[#00ff88]" />
                      <span className="truncate">{fotoTrade ? fotoTrade.name : 'Anexar Imagem'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFotoTrade(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Comentários + Botão Salvar */}
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <input
                    type="text"
                    placeholder="Observações técnicas do trade (gatilho, contexto, erros)..."
                    value={comentarios}
                    onChange={(e) => setComentarios(e.target.value)}
                    className="flex-1 bg-[#141414] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00ff88]"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#00ff88] hover:bg-[#00e077] disabled:opacity-50 text-black font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(0,255,136,0.25)] whitespace-nowrap"
                  >
                    {saving ? 'Salvando na nuvem...' : '+ Registrar Operação'}
                  </button>
                </div>
              </form>
            </section>

            {/* Resumo e Filtros */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-bold text-white">Resumo e Filtros</h2>
              </div>

              {/* Barra de Filtros */}
              <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Filter className="w-4 h-4 text-zinc-500 mr-1" />
                  {[
                    { id: 'semana', label: 'Esta Semana' },
                    { id: '15d', label: 'Últ. 15 dias' },
                    { id: '30d', label: 'Últ. 30 dias' },
                    { id: '60d', label: 'Últ. 60 dias' },
                    { id: '3m', label: '3 Meses' },
                    { id: '6m', label: '6 Meses' },
                    { id: '12m', label: '12 Meses' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPeriodoFiltro(p.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        periodoFiltro === p.id
                          ? 'bg-[#00ff88] text-black shadow-[0_0_12px_rgba(0,255,136,0.3)]'
                          : 'bg-[#161616] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <select
                  value={contaFiltro}
                  onChange={(e) => setContaFiltro(e.target.value)}
                  className="bg-[#141414] border border-[#00ff88]/40 rounded-xl px-3.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="todas">Todas as Contas</option>
                  <option value="Geral">Geral / Padrão</option>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.tipo})
                    </option>
                  ))}
                </select>
              </div>

              {/* Cards de Métricas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">P&L PERÍODO</span>
                  <p
                    className={`text-2xl font-extrabold mt-1 ${
                      metricas.pnlTotal >= 0 ? 'text-[#00ff88]' : 'text-red-500'
                    }`}
                  >
                    {metricas.pnlTotal >= 0 ? '$' : '-$'}
                    {Math.abs(metricas.pnlTotal).toFixed(2)}
                  </p>
                </div>

                <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">WIN RATE</span>
                  <p className="text-2xl font-extrabold text-white mt-1">{metricas.winRate.toFixed(1)}%</p>
                </div>

                <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">PROFIT FACTOR</span>
                  <p className="text-2xl font-extrabold text-[#00ff88] mt-1">{metricas.profitFactor}</p>
                </div>

                <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    EMOCIONAL PREDOMINANTE
                  </span>
                  <div className="mt-1.5 flex justify-center">
                    <span className="px-3 py-1 rounded-full bg-[#181818] border border-zinc-700 text-xs font-semibold text-white flex items-center gap-1.5">
                      <span>{metricas.emocionalPredominante.emoji}</span>
                      <span>{metricas.emocionalPredominante.label}</span>
                    </span>
                  </div>
                </div>

                <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    PLANO RESPEITADO
                  </span>
                  <p className="text-xl font-extrabold text-[#00ff88] mt-1">
                    {metricas.planoRespeitado.toFixed(1)}%
                  </p>
                </div>

                <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    MAX WINS CONSEC.
                  </span>
                  <p className="text-xl font-extrabold text-[#00ff88] mt-1">{metricas.maxWinStreak}</p>
                </div>

                <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    MAX LOSS CONSEC.
                  </span>
                  <p className="text-xl font-extrabold text-red-500 mt-1">{metricas.maxLossStreak}</p>
                </div>

                <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    TOTAL TRADES FILTRADOS
                  </span>
                  <p className="text-xl font-extrabold text-white mt-1">{metricas.total}</p>
                </div>
              </div>

              {/* Notas do Período */}
              <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-4">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  NOTAS DO PERÍODO
                </label>
                <textarea
                  rows={2}
                  value={notasPeriodo}
                  onChange={(e) => setNotasPeriodo(e.target.value)}
                  placeholder="Escreva seus aprendizados, erros e plano de ação para este filtro..."
                  className="w-full bg-[#080808] border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-[#00ff88]"
                />
              </div>
            </section>

            {/* Histórico Filtrado */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                HISTÓRICO FILTRADO ({tradesFiltrados.length})
              </h3>

              <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800/80 text-[10px] font-bold uppercase text-zinc-500 bg-[#111111]">
                        <th className="py-3 px-4">Data / Sessão</th>
                        <th className="py-3 px-4">Conta</th>
                        <th className="py-3 px-4">Direção</th>
                        <th className="py-3 px-4">Resultado</th>
                        <th className="py-3 px-4">P&L</th>
                        <th className="py-3 px-4">Duração</th>
                        <th className="py-3 px-4">Plano</th>
                        <th className="py-3 px-4">Emoção</th>
                        <th className="py-3 px-4">Print</th>
                        <th className="py-3 px-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 text-xs">
                      {tradesFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-zinc-500">
                            Nenhuma operação registrada neste filtro ainda.
                          </td>
                        </tr>
                      ) : (
                        tradesFiltrados.map((t) => {
                          const emoObj = EMOCOES.find((e) => e.label === t.emocao);
                          return (
                            <tr key={t.id} className="hover:bg-[#141414]/60 transition-colors">
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="font-semibold text-white">{t.data}</div>
                                <div className="text-[10px] text-zinc-500">{t.sessao} • {t.ativo}</div>
                              </td>
                              <td className="py-3 px-4 text-zinc-300">{getNomeConta(t.conta_id)}</td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 font-bold ${
                                    t.direcao === 'Buy' ? 'text-[#00ff88]' : 'text-red-400'
                                  }`}
                                >
                                  {t.direcao === 'Buy' ? (
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                  ) : (
                                    <ArrowDownRight className="w-3.5 h-3.5" />
                                  )}
                                  {t.direcao}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    t.resultado === 'TP'
                                      ? 'bg-[#00ff88]/15 text-[#00ff88]'
                                      : t.resultado === 'SL'
                                      ? 'bg-red-500/15 text-red-400'
                                      : 'bg-zinc-700/40 text-zinc-300'
                                  }`}
                                >
                                  {t.resultado}
                                </span>
                              </td>
                              <td
                                className={`py-3 px-4 font-bold whitespace-nowrap ${
                                  Number(t.pnl) >= 0 ? 'text-[#00ff88]' : 'text-red-400'
                                }`}
                              >
                                {Number(t.pnl) >= 0 ? '+' : '-'}${Math.abs(Number(t.pnl)).toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {t.duracao}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {t.seguiu_plano ? (
                                  <span className="text-[#00ff88] font-semibold">Sim</span>
                                ) : (
                                  <span className="text-red-400 font-semibold">Não</span>
                                )}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className="px-2.5 py-1 rounded-full bg-[#181818] border border-zinc-800 text-[11px]">
                                  {emoObj?.emoji} {t.emocao}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {t.foto_url ? (
                                  <button
                                    onClick={() => setImagemModal(t.foto_url!)}
                                    className="text-[#00ff88] hover:underline inline-flex items-center gap-1 text-[11px]"
                                  >
                                    <ImageIcon className="w-3.5 h-3.5" /> Ver
                                  </button>
                                ) : (
                                  <span className="text-zinc-600">-</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => handleDeleteTrade(t.id)}
                                  className="text-zinc-600 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        ) : (
          /* ABA DE MESAS PROPRIETÁRIAS & ROI */
          <div className="space-y-6">
            {/* Cards Financeiros de ROI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-4">
                <span className="text-[10px] font-bold uppercase text-zinc-500">INVESTIMENTO (CUSTOS)</span>
                <p className="text-2xl font-extrabold text-red-400 mt-1">
                  -${resumoMesas.totalCustos.toFixed(2)}
                </p>
              </div>

              <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-4">
                <span className="text-[10px] font-bold uppercase text-zinc-500">TOTAL RETIROS (SAQUES)</span>
                <p className="text-2xl font-extrabold text-[#00ff88] mt-1">
                  +${resumoMesas.totalRetiros.toFixed(2)}
                </p>
              </div>

              <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-4">
                <span className="text-[10px] font-bold uppercase text-zinc-500">LUCRO LÍQUIDO REAL</span>
                <p
                  className={`text-2xl font-extrabold mt-1 ${
                    resumoMesas.lucroLiquido >= 0 ? 'text-[#00ff88]' : 'text-red-400'
                  }`}
                >
                  {resumoMesas.lucroLiquido >= 0 ? '+$' : '-$'}
                  {Math.abs(resumoMesas.lucroLiquido).toFixed(2)}
                </p>
              </div>

              <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-4">
                <span className="text-[10px] font-bold uppercase text-zinc-500">ROI SOBRE MESAS</span>
                <p
                  className={`text-2xl font-extrabold mt-1 ${
                    resumoMesas.roi >= 0 ? 'text-[#00ff88]' : 'text-red-400'
                  }`}
                >
                  {resumoMesas.roi.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gestão de Contas */}
              <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#00ff88]" />
                  Minhas Contas (Teste vs Real)
                </h3>

                <form onSubmit={handleAddConta} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="Ex: Lucid Trading 50K"
                    value={nomeConta}
                    onChange={(e) => setNomeConta(e.target.value)}
                    className="sm:col-span-2 bg-[#141414] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00ff88]"
                    required
                  />
                  <select
                    value={tipoConta}
                    onChange={(e) => setTipoConta(e.target.value as 'Teste' | 'Real')}
                    className="bg-[#141414] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Teste">Teste</option>
                    <option value="Real">Real</option>
                  </select>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#00ff88] text-black font-bold text-xs rounded-xl py-2 px-3 hover:bg-[#00e077]"
                  >
                    + Conta
                  </button>
                </form>

                <div className="space-y-2 pt-2">
                  {contas.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-4">Nenhuma conta cadastrada.</p>
                  ) : (
                    contas.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between bg-[#141414] border border-zinc-800/80 rounded-xl p-3"
                      >
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            {c.nome}
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                c.tipo === 'Real'
                                  ? 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30'
                                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {c.tipo}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={c.status}
                            onChange={(e) =>
                              handleUpdateContaStatus(
                                c.id,
                                e.target.value as 'Em andamento' | 'Aprovada' | 'Reprovada'
                              )
                            }
                            className="bg-[#0d0d0d] border border-zinc-700 rounded-lg px-2 py-1 text-[11px] text-zinc-200"
                          >
                            <option value="Em andamento">Em andamento</option>
                            <option value="Aprovada">Aprovada</option>
                            <option value="Reprovada">Reprovada</option>
                          </select>
                          <button
                            onClick={() => handleDeleteConta(c.id)}
                            className="text-zinc-600 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Registro de Custos e Retiros */}
              <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#00ff88]" />
                  Registrar Movimentação (Custos & Retiros)
                </h3>

                <form onSubmit={handleAddMovimentacao} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTipoMov('Custo')}
                      className={`py-2 rounded-xl text-xs font-bold border ${
                        tipoMov === 'Custo'
                          ? 'bg-red-500/15 border-red-500 text-red-400'
                          : 'bg-[#141414] border-zinc-800 text-zinc-500'
                      }`}
                    >
                      - Novo Custo (Teste/Ativação)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoMov('Retiro')}
                      className={`py-2 rounded-xl text-xs font-bold border ${
                        tipoMov === 'Retiro'
                          ? 'bg-[#00ff88]/15 border-[#00ff88] text-[#00ff88]'
                          : 'bg-[#141414] border-zinc-800 text-zinc-500'
                      }`}
                    >
                      + Novo Retiro (Saque)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Empresa (ex: FundedNext)"
                      value={empresaMov}
                      onChange={(e) => setEmpresaMov(e.target.value)}
                      className="bg-[#141414] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                      required
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Valor ($)"
                      value={valorMov}
                      onChange={(e) => setValorMov(e.target.value)}
                      className="bg-[#141414] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                      required
                    />
                    <input
                      type="date"
                      value={dataMov}
                      onChange={(e) => setDataMov(e.target.value)}
                      className="bg-[#141414] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                      required
                    />
                  </div>

                  {/* Foto somente para Retiro */}
                  {tipoMov === 'Retiro' && (
                    <label className="flex items-center justify-center gap-2 w-full bg-[#141414] hover:bg-[#1a1a1a] border border-dashed border-[#00ff88]/40 rounded-xl px-3 py-2.5 text-xs text-zinc-300 cursor-pointer">
                      <Upload className="w-4 h-4 text-[#00ff88]" />
                      <span>
                        {fotoComprovante ? fotoComprovante.name : 'Anexar Certificado / Print do Retiro'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFotoComprovante(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-[#00ff88] hover:bg-[#00e077] text-black font-bold text-xs py-2.5 rounded-xl transition-all"
                  >
                    {saving ? 'Salvando...' : `Salvar ${tipoMov}`}
                  </button>
                </form>

                {/* Lista de Movimentações */}
                <div className="space-y-2 pt-2 max-h-64 overflow-y-auto">
                  {movimentacoes.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between bg-[#141414] border border-zinc-800/80 rounded-xl p-3 text-xs"
                    >
                      <div>
                        <span className="font-bold text-white">{m.empresa}</span>
                        <span className="text-zinc-500 text-[11px] ml-2">{m.data}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {m.comprovante_url && (
                          <button
                            onClick={() => setImagemModal(m.comprovante_url!)}
                            className="text-[#00ff88] hover:underline text-[11px] flex items-center gap-1"
                          >
                            <ImageIcon className="w-3.5 h-3.5" /> Certificado
                          </button>
                        )}
                        <span
                          className={`font-bold ${
                            m.tipo === 'Retiro' ? 'text-[#00ff88]' : 'text-red-400'
                          }`}
                        >
                          {m.tipo === 'Retiro' ? '+' : '-'}${Number(m.valor).toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleDeleteMovimentacao(m.id)}
                          className="text-zinc-600 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal de Visualização de Imagem */}
      {imagemModal && (
        <div
          onClick={() => setImagemModal(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl w-full bg-[#111] border border-zinc-800 rounded-2xl p-2">
            <button
              onClick={() => setImagemModal(null)}
              className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={imagemModal} alt="Comprovante" className="w-full max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
