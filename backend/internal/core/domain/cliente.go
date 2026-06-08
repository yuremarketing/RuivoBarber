package domain

type Cliente struct {
    ID    int    `json:"id"`
    Nome  string `json:"nome"`
    Login string `json:"login"`
    Cargo string `json:"cargo"`
    XP    int    `json:"xp"`
    Nivel string `json:"nivel"`
}
