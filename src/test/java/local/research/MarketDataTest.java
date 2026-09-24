package local.research;

import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static local.research.MarketData.*;

class MarketDataTest {
    private Bar bar(int day,double price){return new Bar(LocalDate.of(2020,1,1).plusDays(day),price,price+.25,price-.25,price,null,100,0);}
    @Test void fullWindowRequiredAndConstantSeriesEqualsOne(){
        var input=new ArrayList<Bar>();for(int i=0;i<800;i++)input.add(bar(i,100));
        var result=calculate(input);
        assertThat(result.subList(0,755)).allMatch(p->p.normalized()==null);
        assertThat(result.subList(755,800)).allMatch(p->p.normalized()==1.0&&p.ma3y()==100);
    }
    @Test void rollingSumDropsOldestPriceAndIncludesCurrent(){
        var input=new ArrayList<Bar>();for(int i=0;i<757;i++)input.add(bar(i,i+1));
        var result=calculate(input);
        assertThat(result.get(755).ma3y()).isEqualTo(378.5);
        assertThat(result.get(756).ma3y()).isEqualTo(379.5);
        assertThat(result.get(756).normalized()).isCloseTo(757.0/379.5,within(1e-12));
    }
    @Test void envelopeUsesSameDenominator(){
        var input=new ArrayList<Bar>();for(int i=0;i<756;i++)input.add(bar(i,100));
        var p=calculate(input).getLast();
        assertThat(p.normalizedLow()).isEqualTo(.9975);
        assertThat(p.normalizedHigh()).isEqualTo(1.0025);
        assertThat(p.settle()).isNull();
    }
    @Test void duplicatesAndInvalidPricesFail(){
        assertThatThrownBy(()->calculate(List.of(bar(0,100),bar(0,101)))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->calculate(List.of(bar(0,Double.NaN)))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->calculate(List.of(bar(0,-1)))).isInstanceOf(IllegalArgumentException.class);
    }
}
