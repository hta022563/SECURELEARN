package FCAJ.SecureLearn.Configuration;

import FCAJ.SecureLearn.Model.ActionType;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 *
 * @author PC
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface LogAnnotationClass {
    ActionType value();
}
