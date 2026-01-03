# ETAPA 1: Construcción (Usamos una imagen con Maven y Java 21)
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY . .
# Construimos el jar saltando los tests para ir rápido
RUN mvn clean package -DskipTests

# ETAPA 2: Ejecución (Usamos una imagen ligera solo para correrlo)
FROM eclipse-temurin:21-jdk-alpine
VOLUME /tmp
# Copiamos el jar que fabricamos en la etapa 1
COPY --from=build /app/target/*.jar app.jar
# Abrimos el puerto 8080
EXPOSE 8080
# Comando de arranque
ENTRYPOINT ["java","-jar","app.jar"]