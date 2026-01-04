package com.riotproject.lol_tracker;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;

@RestController
public class RiotController {

    @Value("${riot.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping("/api/search")
    public ResponseEntity<?> buscarJugador(
            @RequestParam String nombre,
            @RequestParam String tag,
            @RequestParam(defaultValue = "0") int start) { // Nuevo: permite paginación
        try {
            // --- PASO 1: Obtener PUUID ---
            String urlAccount = "https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{name}/{tag}?api_key={apiKey}";
            Map<String, Object> accountData = restTemplate.getForObject(urlAccount, Map.class, nombre, tag, apiKey);
            String puuid = (String) accountData.get("puuid");

            // --- PASO 2: Obtener Icono y Nivel ---
            String urlSummoner = "https://la2.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/" + puuid + "?api_key=" + apiKey;
            Map<String, Object> summonerData = restTemplate.getForObject(urlSummoner, Map.class);

            Map<String, Object> respuestaFinal = new HashMap<>();
            respuestaFinal.put("nombre", accountData.get("gameName"));
            respuestaFinal.put("tag", accountData.get("tagLine"));
            respuestaFinal.put("nivel", summonerData.get("summonerLevel"));
            respuestaFinal.put("iconoId", summonerData.get("profileIconId"));

            respuestaFinal.put("rango", "UNRANKED");
            respuestaFinal.put("lp", 0);
            respuestaFinal.put("winrate", 0);

            // --- PASO 3: Obtener Rango ---
            try {
                String urlLeague = "https://la2.api.riotgames.com/lol/league/v4/entries/by-puuid/" + puuid + "?api_key=" + apiKey;
                Object[] leagues = restTemplate.getForObject(urlLeague, Object[].class);

                if (leagues != null) {
                    for (Object l : leagues) {
                        Map<String, Object> leagueMap = (Map<String, Object>) l;
                        if ("RANKED_SOLO_5x5".equals(leagueMap.get("queueType"))) {
                            respuestaFinal.put("rango", leagueMap.get("tier") + " " + leagueMap.get("rank"));
                            respuestaFinal.put("lp", leagueMap.get("leaguePoints"));
                            double wins = Double.valueOf(leagueMap.get("wins").toString());
                            double losses = Double.valueOf(leagueMap.get("losses").toString());
                            double wr = (wins / (wins + losses)) * 100;
                            respuestaFinal.put("winrate", Math.round(wr));
                            break;
                        }
                    }
                }
            } catch (Exception e) {
                System.out.println("Error buscando liga: " + e.getMessage());
            }

            // --- PASO 4: Obtener MAESTRÍAS ---
            try {
                String urlMastery = "https://la2.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/" + puuid + "/top?count=3&api_key=" + apiKey;
                List<Map<String, Object>> masteries = restTemplate.getForObject(urlMastery, List.class);
                respuestaFinal.put("maestrias", masteries);
            } catch (Exception e) {
                respuestaFinal.put("maestrias", null);
            }

            // --- PASO 5: HISTORIAL DE PARTIDAS EXPANDIDO ---
            try {
                // Usamos el parámetro 'start' dinámico que viene del JS
                String urlMatches = "https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/" + puuid + "/ids?start=" + start + "&count=5&api_key=" + apiKey;
                List<String> matchIds = restTemplate.getForObject(urlMatches, List.class);

                List<Map<String, Object>> historialList = new ArrayList<>();
                if (matchIds != null) {
                    for (String id : matchIds) {
                        String urlMatchDetail = "https://americas.api.riotgames.com/lol/match/v5/matches/" + id + "?api_key=" + apiKey;
                        Map<String, Object> matchDetail = restTemplate.getForObject(urlMatchDetail, Map.class);
                        Map<String, Object> info = (Map<String, Object>) matchDetail.get("info");
                        List<Map<String, Object>> participants = (List<Map<String, Object>>) info.get("participants");

                        Map<String, Object> simplifiedMatch = new HashMap<>();
                        List<String> team1 = new ArrayList<>();
                        List<String> team2 = new ArrayList<>();

                        // Recorremos los 10 participantes de la partida
                        for (int i = 0; i < participants.size(); i++) {
                            Map<String, Object> p = participants.get(i);
                            String champ = p.get("championName").toString();

                            // Separar en dos equipos (0-4 y 5-9)
                            if (i < 5) team1.add(champ); else team2.add(champ);

                            // Si es el jugador que buscamos, guardamos sus stats específicos
                            if (puuid.equals(p.get("puuid"))) {
                                simplifiedMatch.put("championName", champ);
                                simplifiedMatch.put("win", p.get("win"));
                                simplifiedMatch.put("kills", p.get("kills"));
                                simplifiedMatch.put("deaths", p.get("deaths"));
                                simplifiedMatch.put("assists", p.get("assists"));
                                simplifiedMatch.put("cs", p.get("totalMinionsKilled"));
                                simplifiedMatch.put("level", p.get("champLevel"));
                                simplifiedMatch.put("item0", p.get("item0"));
                                simplifiedMatch.put("item1", p.get("item1"));
                                simplifiedMatch.put("item2", p.get("item2"));
                                simplifiedMatch.put("item3", p.get("item3"));
                                simplifiedMatch.put("item4", p.get("item4"));
                                simplifiedMatch.put("item5", p.get("item5"));
                                simplifiedMatch.put("item6", p.get("item6")); // El ward/trinket
                            }
                        }
                        simplifiedMatch.put("team1", team1);
                        simplifiedMatch.put("team2", team2);
                        historialList.add(simplifiedMatch);
                    }
                }
                respuestaFinal.put("historial", historialList);
            } catch (Exception e) {
                System.out.println("Error historial: " + e.getMessage());
            }

            return ResponseEntity.ok(respuestaFinal);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/api/feedback")
    public ResponseEntity<String> recibirFeedback(@RequestBody Map<String, String> payload) {
        System.out.println("📩 NUEVA SUGERENCIA: " + payload.get("mensaje"));
        return ResponseEntity.ok("Recibido");
    }
}