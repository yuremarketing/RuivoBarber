package services

import (
	"context"
	"errors"
	"strings"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type ClaService struct {
	repo ports.ClaRepository
}

func NewClaService(repo ports.ClaRepository) *ClaService {
	return &ClaService{repo: repo}
}

func (s *ClaService) CriarCla(ctx context.Context, liderID int, nome, descricao string) (*domain.Cla, error) {
	nome = strings.TrimSpace(nome)
	if nome == "" {
		return nil, errors.New("o nome do clã não pode ser vazio")
	}

	// 1. Verificar se o líder já é membro de algum clã
	membro, err := s.repo.FindMember(ctx, liderID)
	if err != nil {
		return nil, err
	}
	if membro != nil {
		return nil, errors.New("você já pertence a um clã")
	}

	// 2. Verificar se o clã já existe
	existente, err := s.repo.FindByName(ctx, nome)
	if err != nil {
		return nil, err
	}
	if existente != nil {
		return nil, errors.New("já existe um clã com este nome")
	}

	cla := &domain.Cla{
		Nome:      nome,
		Descricao: strings.TrimSpace(descricao),
		LiderID:   liderID,
	}

	err = s.repo.Create(ctx, cla)
	if err != nil {
		return nil, err
	}

	return cla, nil
}

func (s *ClaService) ConvidarUsuario(ctx context.Context, liderID, convidadoID int) error {
	if liderID == convidadoID {
		return errors.New("não pode convidar a si mesmo")
	}

	// 1. Verificar se o enviador é líder de um clã
	membro, err := s.repo.FindMember(ctx, liderID)
	if err != nil {
		return err
	}
	if membro == nil || membro.Cargo != "Lider" {
		return errors.New("apenas o líder do clã pode enviar convites")
	}

	// 2. Verificar se o convidado já é membro de algum clã
	membroConvidado, err := s.repo.FindMember(ctx, convidadoID)
	if err != nil {
		return err
	}
	if membroConvidado != nil {
		return errors.New("o usuário convidado já pertence a um clã")
	}

	return s.repo.CreateInvite(ctx, membro.ClaID, convidadoID, liderID)
}

func (s *ClaService) ListarConvites(ctx context.Context, usuarioID int) ([]domain.ClaConviteDTO, error) {
	return s.repo.ListInvitesByConvidadoID(ctx, usuarioID)
}

func (s *ClaService) AceitarConvite(ctx context.Context, inviteID, convidadoID int) error {
	// 1. Buscar convite e validar
	claID, cID, status, err := s.repo.FindInviteByID(ctx, inviteID)
	if err != nil {
		return errors.New("convite não encontrado")
	}
	if status != "Pendente" {
		return errors.New("este convite já foi processado")
	}
	if cID != convidadoID {
		return errors.New("acesso não autorizado para este convite")
	}

	// 2. Verificar se o convidado já entrou em outro clã nesse meio tempo
	membro, err := s.repo.FindMember(ctx, convidadoID)
	if err != nil {
		return err
	}
	if membro != nil {
		return errors.New("você já pertence a um clã")
	}

	// 3. Adicionar membro ao clã
	newMember := &domain.ClaMembro{
		UsuarioID: convidadoID,
		ClaID:     claID,
		Cargo:     "Membro",
	}
	err = s.repo.AddMember(ctx, newMember)
	if err != nil {
		return err
	}

	// 4. Marcar convite como aceito
	return s.repo.UpdateInviteStatus(ctx, inviteID, "Aceito")
}

func (s *ClaService) RecusarConvite(ctx context.Context, inviteID, convidadoID int) error {
	// 1. Buscar convite e validar
	_, cID, status, err := s.repo.FindInviteByID(ctx, inviteID)
	if err != nil {
		return errors.New("convite não encontrado")
	}
	if status != "Pendente" {
		return errors.New("este convite já foi processado")
	}
	if cID != convidadoID {
		return errors.New("acesso não autorizado para este convite")
	}

	// 2. Marcar convite como recusado
	return s.repo.UpdateInviteStatus(ctx, inviteID, "Recusado")
}

func (s *ClaService) ListarMembros(ctx context.Context, claID int) ([]domain.Cliente, error) {
	return s.repo.ListMembers(ctx, claID)
}

func (s *ClaService) ObterMembroInfo(ctx context.Context, userID int) (*domain.ClaMembro, error) {
	return s.repo.FindMember(ctx, userID)
}

func (s *ClaService) ObterClaPorID(ctx context.Context, id int) (*domain.Cla, error) {
	cla, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if cla == nil {
		return nil, errors.New("clã não encontrado")
	}
	return cla, nil
}

func (s *ClaService) ObterClaDoUsuario(ctx context.Context, userID int) (*domain.Cla, error) {
	membro, err := s.repo.FindMember(ctx, userID)
	if err != nil {
		return nil, err
	}
	if membro == nil {
		return nil, errors.New("você não pertence a nenhum clã")
	}
	cla, err := s.repo.FindByID(ctx, membro.ClaID)
	if err != nil {
		return nil, err
	}
	if cla == nil {
		return nil, errors.New("clã não encontrado")
	}
	return cla, nil
}
