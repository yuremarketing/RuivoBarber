package services

import (
	"context"
	"errors"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type LiveService struct {
	repo ports.LiveRepository
}

func NewLiveService(repo ports.LiveRepository) *LiveService {
	return &LiveService{repo: repo}
}

func (s *LiveService) CriarLive(ctx context.Context, live *domain.Live) error {
	if live.Titulo == "" {
		return errors.New("título da live é obrigatório")
	}
	if live.Url == "" {
		return errors.New("URL da live é obrigatória")
	}
	if live.Plataforma == "" {
		return errors.New("plataforma da live é obrigatória")
	}
	return s.repo.Criar(ctx, live)
}

func (s *LiveService) ListarLives(ctx context.Context) ([]domain.Live, error) {
	return s.repo.Listar(ctx)
}

func (s *LiveService) ObterLiveAtiva(ctx context.Context) (*domain.Live, error) {
	return s.repo.ObterAtiva(ctx)
}

func (s *LiveService) AtivarLive(ctx context.Context, id int) error {
	if id <= 0 {
		return errors.New("ID de live inválido")
	}
	return s.repo.Ativar(ctx, id)
}

func (s *LiveService) ExcluirLive(ctx context.Context, id int) error {
	if id <= 0 {
		return errors.New("ID de live inválido")
	}
	return s.repo.Excluir(ctx, id)
}
