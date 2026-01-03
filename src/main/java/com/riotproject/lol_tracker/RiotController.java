package com.riotproject.lol_tracker;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

// --- AQUÍ ESTABA EL ERROR: Faltaban estas importaciones ---
import java.util.HashMap;
import java.util.List;  // <--- ¡Esta es la que arregla el rojo!
import java.util.Map;

@RestController
public class RiotController {

    @Value("${riot.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping("/api/search")
    public ResponseEntity<?> buscarJugador(@RequestParam String nombre, @RequestParam String tag) {
        try {
            // --- PASO 1: Obtener PUUID ---
            String urlAccount = "https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{name}/{tag}?api_key={apiKey}";
            Map<String, Object> accountData = restTemplate.getForObject(urlAccount, Map.class, nombre, tag, apiKey);
            String puuid = (String) accountData.get("puuid");

            // --- PASO 2: Obtener Icono y Nivel ---
            String urlSummoner = "https://la2.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/" + puuid + "?api_key=" + apiKey;
            Map<String, Object> summonerData = restTemplate.getForObject(urlSummoner, Map.class);

            // Armamos la respuesta visual base
            Map<String, Object> respuestaFinal = new HashMap<>();
            respuestaFinal.put("nombre", accountData.get("gameName"));
            respuestaFinal.put("tag", accountData.get("tagLine"));
            respuestaFinal.put("nivel", summonerData.get("summonerLevel"));
            respuestaFinal.put("iconoId", summonerData.get("profileIconId"));

            respuestaFinal.put("rango", "UNRANKED");
            respuestaFinal.put("lp", 0);
            respuestaFinal.put("winrate", 0);

            // --- PASO 3: Obtener Rango (Método PUUID Directo) ---
            try {
                String urlLeague = "https://la2.api.riotgames.com/lol/league/v4/entries/by-puuid/" + puuid + "?api_key=" + apiKey;
                Object[] leagues = restTemplate.getForObject(urlLeague, Object[].class);

                if (leagues != null) {
                    for (Object l : leagues) {
                        Map<String, Object> leagueMap = (Map<String, Object>) l;
                        if ("RANKED_SOLO_5x5".equals(leagueMap.get("queueType"))) {
                            respuestaFinal.put("rango", leagueMap.get("tier") + " " + leagueMap.get("rank"));
                            respuestaFinal.put("lp", leagueMap.get("leaguePoints"));
                            double wins = (Integer) leagueMap.get("wins");
                            double losses = (Integer) leagueMap.get("losses");
                            double wr = (wins / (wins + losses)) * 100;
                            respuestaFinal.put("winrate", Math.round(wr));
                            break;
                        }
                    }
                }
            } catch (Exception e) {
                System.out.println("Error buscando liga: " + e.getMessage());
            }

            // --- PASO 4: Obtener MAESTRÍA DE CAMPEONES (Top 3) ---
            try {
                // count=3 para que solo traiga el podio
                String urlMastery = "https://la2.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/" + puuid + "/top?count=3&api_key=" + apiKey;
                List<Map<String, Object>> masteries = restTemplate.getForObject(urlMastery, List.class);
                respuestaFinal.put("maestrias", masteries);

            } catch (Exception e) {
                System.out.println("Error buscando maestrías: " + e.getMessage());
                respuestaFinal.put("maestrias", null);
            }

            return ResponseEntity.ok(respuestaFinal);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }
}
