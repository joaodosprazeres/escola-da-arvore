/**
 * Cadastro de usuário com confirmação e retorno à lista atualizada (FR-024).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TEXTOS } from '../../config';
import { usePortas } from '../../services/PortasProvider';
import type { ErroDeGestao, NovoUsuario } from '../../services/usuarios/types';
import { FormularioDeUsuario } from '../organisms/FormularioDeUsuario';
import { LayoutInterno } from '../templates/LayoutInterno';

export function NovoUsuarioPage() {
  const { usuarios } = usePortas();
  const navegar = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<ErroDeGestao | null>(null);

  async function aoSubmeter(dados: NovoUsuario): Promise<void> {
    setEnviando(true);
    setErro(null);

    const resultado = await usuarios.criar(dados);

    setEnviando(false);

    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }

    navegar('/usuarios', {
      replace: true,
      state: { mensagem: TEXTOS.novoUsuario.sucesso.replace('{nome}', resultado.valor.nome) },
    });
  }

  return (
    <LayoutInterno titulo={TEXTOS.novoUsuario.titulo}>
      <FormularioDeUsuario
        aoSubmeter={(dados) => void aoSubmeter(dados)}
        enviando={enviando}
        erro={erro}
      />
    </LayoutInterno>
  );
}
