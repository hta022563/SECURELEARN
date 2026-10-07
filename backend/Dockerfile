FROM eclipse-temurin:25-jdk AS build
WORKDIR /backend
COPY pom.xml mvnw ./
COPY .mvn .mvn
RUN ./mvnw dependency:go-offline
COPY src src
RUN ./mvnw clean package -DskipTests


FROM eclipse-temurin:25-jre
WORKDIR /backend
COPY --from=build /backend/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]