package ports

import (
	"context"
	"ruivobarber-api/internal/core/domain"
)

type ClaRepository interface {
	Create(ctx context.Context, cla *domain.Cla) error
	FindByID(ctx context.Context, id int) (*domain.Cla, error)
	FindByName(ctx context.Context, name string) (*domain.Cla, error)
	FindMember(ctx context.Context, userID int) (*domain.ClaMembro, error)
	AddMember(ctx context.Context, member *domain.ClaMembro) error
	ListMembers(ctx context.Context, claID int) ([]domain.Cliente, error)
	CreateInvite(ctx context.Context, claID, convidadoID, enviadoPor int) error
	FindInviteByID(ctx context.Context, inviteID int) (claID, convidadoID int, status string, err error)
	UpdateInviteStatus(ctx context.Context, inviteID int, status string) error
	ListInvitesByConvidadoID(ctx context.Context, convidadoID int) ([]domain.ClaConviteDTO, error)
	ListarClas(ctx context.Context) ([]domain.ClaRankingDTO, error)
	SalvarMensagemMural(ctx context.Context, msg *domain.ClaMensagem) error
	ListarMensagensMural(ctx context.Context, claID int) ([]domain.ClaMensagemDTO, error)
	BuscarJogadoresSemCla(ctx context.Context, query string) ([]domain.JogadorBuscaDTO, error)
}
