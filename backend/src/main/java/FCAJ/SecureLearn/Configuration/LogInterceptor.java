/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Configuration;

import FCAJ.SecureLearn.Model.ActionType;
import FCAJ.SecureLearn.Service.AuthService;
import FCAJ.SecureLearn.Service.LogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

/**
 *
 * @author PC
 */
@Component
public class LogInterceptor implements HandlerInterceptor {
    private static final Logger logger = LoggerFactory.getLogger(LogInterceptor.class);
    private final LogService logService;
    private final AuthService authService;

    public LogInterceptor(LogService logService, AuthService authService) {
        this.logService = logService;
        this.authService = authService;
    }
    
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex){
        if(!(handler instanceof HandlerMethod handlerMethod)){
            return;
        }
        LogAnnotationClass annotation = handlerMethod.getMethodAnnotation(LogAnnotationClass.class);
        if(annotation == null){
            return;
        }
        String username = getUsername(request);
        if(username == null){
            return;
        }
        Integer segmentId = 0;
        UUID lessonId = null;
        String email = authService.getEmailByUsername(username);
        Map<String,String> pathVariable = (Map<String,String>) request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
        ActionType actionType = annotation.value();
        String ipAddress = request.getRemoteAddr();
        String userAgent = headerOrUnknown(request, "User-Agent");
        String deviceFingerprint = headerOrUnknown(request, "X-Device-Fingerprint");
        try{
            if(pathVariable.get("id") != null){
        lessonId = UUID.fromString(pathVariable.get("id"));
        }
        if(pathVariable.get("segmentId") != null){
        segmentId = Integer.valueOf(pathVariable.get("segmentId"));
        }
            if(segmentId != null && lessonId != null){
            logService.createLog(email, actionType, LocalDateTime.now(), ipAddress, userAgent, deviceFingerprint, response.getStatus(),segmentId,lessonId);
        }else if(lessonId != null){
            logService.createLog(email, actionType, LocalDateTime.now(), ipAddress, userAgent, deviceFingerprint, response.getStatus(), lessonId);
        }else logService.createLog(username, actionType, LocalDateTime.now(), ipAddress, userAgent, deviceFingerprint, response.getStatus());
        }catch(RuntimeException e){
            logger.warn("Failed to write access log for {} {}", actionType, request.getRequestURI(), e);
        }
    }

    // Login has no JWT yet, so the controller sets the "username" attribute; otherwise read it from the validated JWT
    private String getUsername(HttpServletRequest request){
        if(request.getAttribute("username") instanceof String username){
            return username;
        }
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if(authentication != null && authentication.getPrincipal() instanceof Jwt jwt){
            return jwt.getClaimAsString("username");
        }
        return null;
    }

    private String headerOrUnknown(HttpServletRequest request, String name){
        String value = request.getHeader(name);
        return (value == null || value.isBlank()) ? "unknown" : value;
    }

}
