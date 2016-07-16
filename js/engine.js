/*게임엔진 GearWorld*/

/*호환성에 맞는 애니메이션함수를 적용해주는 소스*/
/*출처 : https://msdn.microsoft.com/ko-kr/library/hh920765(v=vs.85).aspx*/
	window.requestAniFrame = (function () {
	    return window.requestAnimationFrame ||
	            window.webkitRequestAnimationFrame ||
	            window.mozRequestAnimationFrame ||
	            window.oRequestAnimationFrame ||
	            function (callback) {
	                return window.setTimeout(callback, 1000/32); // 저사양이라고 판단하여 설정해 둔 프레임수대신 32fps로 적용함
	            };
	})();
	window.cancelAniFrame = (function () {
	    return window.cancelAnimationFrame ||
	            window.webkitCancelAnimationFrame ||
	            window.mozCancelAnimationFrame ||
	            window.oCancelAnimationFrame ||
	            function (id) {
	                window.clearTimeout(id);
	            };
	})();
/*************************************************************************/

(function(window){
	window.Engine=function(canvas,engineInfo){
		if(!canvas){console.warn("Gear World : 작동하려는 엔진의 기본정보를 입력해주세요"); return 0;}

		this.fps=(engineInfo && engineInfo.fps)|| Engine.prototype.basicEngineInfo.fps;
			this.engineSpeed=1/2;
		this.$gravity=(engineInfo && Vector.isVector(engineInfo.gravity)) || Engine.prototype.basicEngineInfo.gravity; // 중력가속도 설정

		this.$systemValue={
			now:NaN,
			then:Date.now(),
			interval:1000/this.fps,
			delta:NaN,
			engineTime:this.fps/1000/this.engineSpeed,
			contactNormal:[0,1],
			standbyParticleProperty:new Object()
		};
		this.$systemValue.gravity=Vector.multiply(this.$gravity,this.$systemValue.engineTime);
		this.$systemValue.dammping=Math.pow(0.99,this.$systemValue.engineTime)

		this.$canvas=canvas;
			canvas.$systemValue.rotateCenter=true
		this.$particle=new Object();
			this.$particleStack=new Array();
			this.$checkContact=new Object();
		this.$particleKey=new Array();
		this.eventFunc={};
		this.updateParticle=false;
		this.$gearSystem();
	}
	Engine.prototype.basicEngineInfo={
		fps:32,
		gravity:[0,0]
	};
	Engine.prototype.basicParticle={
		m:10,
		a:[0,0],
		v:[0,0],
		f:[0,0],
		i:10,
		t:0,
		rA:0,
		rV:0,
		r:[1,0],
		friction:[0.5,1],
		contactHandling:true,
		restitution:0.3,
		applyGravity:true
	};
	Engine.prototype.particleType={
		m:"number",
		f:"vector",
		a:"vector",
		v:"vector",
		s:"vector",
		i:"number",//관성모멘트로 2d엔진으므로 관성텐서와 상관없이, 스칼라값을 가진다
		t:"number",//토크
		r:"vector",//ROTATE
		rV:"number",//ROTATE V
		rA:"number",//ROTATE A
		friction:"number",
		contactHandling:"boolean",
		applyGravity:"boolean",
		restitution:"number",
	};
	// 1000ms/fps 1000ms 1초를 fps로 나눔
	Engine.prototype.$gearSystem=function(){
		var th=this;
		this.loop=window.requestAniFrame(function(){th.$gearSystem();});

		var sysInfo=this.$systemValue;
			sysInfo.now=Date.now();
			sysInfo.delta=sysInfo.now-sysInfo.then;

		if(sysInfo.delta>sysInfo.engineTime){
			var particleKey=this.$particleKey;

			this.applyParticleProperty(); //대기열에 있는 입자의 변경된속성들을 일괄적용
			
			this.collisionDetection(sysInfo.engineTime); // 충돌검출 및 처리
				
			for(i=0; i<particleKey.length; i++){
				if(this.$updateParticle){
					this.$particle[particleKey[i]].isStop=false;
				}
				var drawElement=this.$canvas.$element[particleKey[i]];
				/*적분기*/
				if(this.integrator(this.$particle[particleKey[i]],sysInfo.engineTime)){
					/*위치 업데이트*/
					drawElement.x=this.$particle[particleKey[i]].s[0];
					drawElement.y=this.$particle[particleKey[i]].s[1];

					/*회전 업데이트*/
					//스칼라 변환 
					//drawElement.rotate=Math.acos(this.$particle[particleKey[i]].r[0]); //적용
				}
			}
			this.$updateParticle=false;
		}
		if(sysInfo.delta>sysInfo.interval){
			this.$canvas.drawElement(this.$canvas.$element);
			sysInfo.then=sysInfo.now-(sysInfo.delta%sysInfo.interval);
		}
	};

	Engine.prototype.integrator=function(particle,duration){
		//F(힘)=m(질량)*a(가속도)
			//a(가속도)=f/m
			//v(속도)=at+v0
			//s(위치)=at^2/2+v0t+s0 이지만 at^2/2이부분을 생략한 근사값을 적용한다.
		if(particle.inverseMass<=0){ // 질량이 Infinity OR 0이하라면 retrun
			return;
		}	

		particle.s=Vector.sum(particle.s,Vector.multiply(particle.v,duration)); //위치업데이트
		particle.a=Vector.multiply(particle.f,particle.inverseMass);
		var gravity=(particle.applyGravity && !particle.isStop) ? this.$systemValue.gravity : [0,0];


		particle.v=Vector.sum(particle.v,Vector.sum(Vector.multiply(particle.a,duration),gravity)); 
		if(Vector.pow_length(particle.v)>=1){
			particle.isStop=false;
		}

		/*댐핑 추가*/
		//particle.v=Vector.multiply(Vector.sum(particle.v,Vector.sum(Vector.multiply(particle.a,duration),gravity)),this.$systemValue.dammping); 
		particle.f=[0,0];
	
		/*각 운동*/
		//(토크)=(강체의 중심으로부터 힘이작용되는점의 상대위치)X(벡터곱)F
			//rA(각가속도)=(토크)/I(관성모멘트)
			//rV(각속도)=rAt+rV0
			//r(각도)=rAt^2/2+rV0t+r0 이지만 at^2/2이부분을 생략한 근사값을 적용한다.

		particle.rA=particle.inverseI*particle.t;
		particle.rV+=particle.rA*duration;

		var rV=[Math.cos(particle.rV),Math.sin(particle.rV)];
		particle.r=Vector.normalize([particle.r[0]*rV[0]-particle.r[1]*rV[1],particle.r[0]*rV[1]+particle.r[1]*rV[0]]); //각 업데이트

		return 1;
	}
	Engine.prototype.stop=function(){
		cancelAnimationFrame(this.loop);
		this.$updateParticle=true;
	}
	Engine.prototype.particle=function(key,info){
		if(!this.$canvas.$element[key]){
			console.warn("Gear World : 엘레먼트의 이름을 올바르게 입력해주세요");
			return;
		}
		var newParticle=this.$particle[key] ? false : true;
		var basicParticle=Engine.prototype.basicParticle;
		/*particleStack은 명령어를 수행할 입자를 저장하는 역할을 한다*/
		/*각 명령은 대부분 particleStack.pop() 을통해 대상이되는 입자를 pop한다.*/
		this.$updateParticle=true;
		switch(newParticle){
			case true: //for문을 통하여 자동화 하여되지만, 편한관리와 버그방지를 위하여 나열식으로 작성한다.
				//나눗셈이 곱셈보다 몇십배 느리기 때문에 역질량을 설정해 곱셈을 사용한다
				info.m=isNaN(Number(info.m)) ? basicParticle.m : Number(info.m);
				info.inverseMass=1/info.m; //역 질량 a=f/inverseMass
				
				var cvss_Element=this.$canvas.$element[key];
				info.f=Vector.isVector(info.f) || [basicParticle.f[0],basicParticle.f[1]];
				info.v=Vector.isVector(info.v) || [basicParticle.v[0],basicParticle.v[1]];
				info.a=Vector.isVector(info.a) || [basicParticle.a[0],basicParticle.a[1]];
				switch(cvss_Element.type){
					case "block":
					case "circle":
						info.s=[cvss_Element.$x,cvss_Element.$y];
						break;
					default:
						info.s=[cvss_Element.x,cvss_Element.y];
				}
				
				info.i=isNaN(info.i) ? basicParticle.i : Number(info.i);
				info.inverseI=1/info.i;//역 관성모멘트
				
				info.t=isNaN(Number(info.t)) ? basicParticle.t : Number(info.t);
				info.rA=isNaN(Number(info.rA)) ? basicParticle.rA : Number(info.rA);
				info.rV=isNaN(Number(info.rV)) ? basicParticle.rV : Number(info.rV);
				
				var vector_r=[Math.cos(cvss_Element.rotate),Math.sin(cvss_Element.rotate)];
				info.r=Vector.isVector(vector_r) ? vector_r : [basicParticle.r[0],basicParticle.r[1]];

				info.friction=isNaN(Number(info.friction)) ? basicParticle.friction : Number(info.friction);
				info.contactHandling=(info.contactHandling===true || info.contactHandling===false) ? info.contactHandling : basicParticle.contactHandling;
				info.restitution=isNaN(Number(info.restitution)) ? basicParticle.restitution : Number(info.restitution);
				
				info.applyGravity=(info.applyGravity===true || info.applyGravity===false) ? info.applyGravity : basicParticle.applyGravity;
				
				this.$particle[key]=info;
				this.$particleKey.push(key);

				this.eventFunc[key]={}
				return 1;
			case false:
				this.$particleStack.push(key);
				return this;
		}

	}
	//particle.property('f',particle.proeprty('f')+nV); 을 통하여 힘발생기 같은 역할이 가능하다.
	//property속성을 통해 입자의 속성이 변경될수 있는데, applyParticleProerty함수는  적분기 실행전에 property속성을 사용해 등록되어진 변경사항들을 일괄적으로 처리한다 
	Engine.prototype.applyParticleProperty=function(){
		var obj=this.$systemValue.standbyParticleProperty,
			key=Object.keys(obj);
		for(var i=0; i<key.length; i++){
			var subKey=typeof obj[key[i]]=="object" ? Object.keys(obj[key[i]]) :NaN;
			if(!subKey){continue;}

			for(var j=0; j<subKey.length; j++){
				this.$particle[key[i]][subKey[j]]=obj[key[i]][subKey[j]];
				delete obj[key[i]][subKey[j]]
			}
			this.$updateParticle=true;

			this.$particle[key[i]].inverseMass=1/this.$particle[key[i]].m; //역질량 재설정
			this.$particle[key[i]].inverseI=1/this.$particle[key[i]].i; //역관성모멘트 재설정
			delete obj[key[i]]

		}
	}
	//원래 정석적인 물리엔진은 속도를 변경하기위해서는 가속도를 변경시키지만,
	//이 엔진은 2d 가벼운 엔진이기때문에 속도를 직접적으로 변경할 수 있게 제작할 것이다.
	//위치 또한 포탈이나 기타 부수적인 기능 때문에 필요하다. 다만, engine.js에서 지원하는 위치벡터를 권장할 예정
	Engine.prototype.property=function(propertyName,propertyValue){
		if(this.$particleStack.length<1){
			return;
		}
		var particleName=this.$particleStack.pop(),particle=this.$systemValue.standbyParticleProperty;
		if(!particle[particleName]){particle[particleName]=new Object();}

		if(typeof propertyName=="object"){ // 첫 요소가 오브젝트형식으로 주어졌을 경우
			var key=Object.keys(propertyName);
			for(var i=0; i<key.length; i++){
				var keyName=key[i].toLowerCase(),
					type=Engine.prototype.particleType[keyName];
				
				if(!type){continue;}
				
				switch(type){
					case "number":
						var result=Number(propertyName[key[i]]);
						type="number";
						break;
					case "vector":
						var result=Vector.isVector(propertyName[key[i]]);
						type="vector";	
						break;
				}
				if((isNaN(result) && type=="number") || (!result && type=="vector") || (type=="B" && (result!==false || result!==true))){
					continue;
				}
				particle[particleName][keyName]=result;
			}
			return 1;
		}else if(typeof propertyName=="string" && Engine.prototype.particleType[propertyName.toLowerCase()]){
			//기본적으로 paticle의 요소는 string 형식을 취하고 있기때문에 typeof propertyName==string을 체크하고, 주어진 propertyName이 허용범위의 속성인지 확인후 그 속성값이 vector인지 number인지 확인한다.
			var name=propertyName.toLowerCase(),
				type;
			switch(Engine.prototype.particleType[name]){
				case "number":
					var result=Number(propertyValue);
					type="N";
					break;
				case "vector":
					var result=Vector.isVector(propertyValue);
					type="V";	
					break;
				case "boolean":
					result=propertyValue;
					type="B"
			}
			if((isNaN(result) && type=="N") || (!result && type=="V") || (type=="B" && (result!==false || result!==true))){
				//propertyName만 주어졌을 경우에는(혹은 value가 올바르지않을경우) particle.propertyName 의 값만을 출력해주는 역할을한다.
				return Vector.isVector(this.$particle[particleName][name]) ? Canvas.prototype.CopyObj(this.$particle[particleName][name]) : this.$particle[particleName][name];
			}
			particle[particleName][name]=result;

			return 1;
		}
		return;
	}
	Engine.prototype.collision=function(func){
		var particleName=this.$particleStack.pop();
		var	lotation=this.eventFunc[particleName];
		lotation.collision=func;
	}
	
	/*충돌감지 및 충돌처리***********************************************************/

	Engine.prototype.collisionDetection=function(duration){
		for(var i=0; i<this.$particleKey.length; i++){
			for(var j=i+1; j<this.$particleKey.length; j++){
				this.REALcollisionDetection(this.$particleKey[i],this.$particleKey[j],duration)
			}
		}
		return;
	}
	Engine.prototype.REALcollisionDetection=function(t,o,duration){
		var tProperty=this.$particle[t]; //타켓 파티클의 속성값
		var oProperty=this.$particle[o]; //파티클의 속성값
		
		if((tProperty.isStop || tProperty.inverseMass==0) && (oProperty.isStop || oProperty.inverseMass==0)){ //정지(에 근접한) 물체 끼리 충돌했을 경우 얼리아웃
			return;
		}

		//정밀충돌감지를 들어가기전에 바운딩박스충돌을 검사한다.
		var	A=this.$canvas.$systemValue.boundingBox[t];
		var	B=this.$canvas.$systemValue.boundingBox[o];
		if(A.top>B.bottom || A.right<B.left || A.bottom<B.top || A.left>B.right){
			return;
		}

		//정밀충돌감지
		var GJK=this.GJK,
			MAX_iteration=10;	
		//particleKey를 참조한다.
		var KEY=this.$particleKey; 
			// 이동거리 = 나중위치-현재위치
			//드로잉 라이브러리의 시스템변수에 접근하여 파티클의 실질 정점들을 불러온다
			tV=this.$canvas.$systemValue.EVENT[t].vertex; 

			oV=this.$canvas.$systemValue.EVENT[o].vertex;
		if(tV.length<3 || oV.length<3){
			return;
		}
		console.log("a")
		//민코스키의 차집합 : tV-oV
		var initialVal={
			o:oV[0],
			t:tV[0]
		}
		var simplexVertex=new Array();
			simplexVertex=[Vector.sub(initialVal.o,initialVal.t)] // o-t
		var saveIndex=[[0,0]];// A:tV[0]의 인덱스 0,oV[0]의 인덱스 0
		var savePoint=[[initialVal.t,initialVal.o]];// A:tV[0]의 값 ,oV[0]의 값
		var oSave={
			u:[1],
		}


		var tempIndex=new Array();
		//support(A-B,d)=support(A,d)-support(B,-d)

		var iteration=0;
		while(iteration<MAX_iteration){
			tempI=Canvas.prototype.CopyObj(saveIndex);

			if(simplexVertex.length>1){
				if(!GJK.getClosestdata(simplexVertex,[0,0],oSave,saveIndex,savePoint)){
					break;
				}
			}
			//새로 추가할 정점탐색을 시작한다
			var d=GJK.searchDirection(simplexVertex);
		
			if(Vector.dotProduct(d,d)==0){
				break;
			}

			var indexT=GJK.support(tV,Vector.negate(d)),
				pointT=tV[indexT],
				indexO=GJK.support(oV,d),
				pointO=oV[indexO];

			//중복 체크
			var duplicate=false;
			for(var i=0; i<tempI.length; i++){
				if(tempI[i][0]==indexT && tempI[i][1]==indexO){
					duplicate=true;
					break;
				}
			}
			if(duplicate===true){
				break;
			}

			simplexVertex.push(Vector.sub(pointO,pointT)); // 추가좌표는 o-t 라는점에주의하자
			// support(A-B,d)의 결과를 새로 저장한다.
			//민코스키 차는 결국 도형 A와 B가 이루고 있으므로 이때 Ai-Bj=민코스키의차e 가된다. 그때문에 i와j의 값을 따로보관하여 관리한다
			saveIndex.push([indexT,indexO]);
			savePoint.push([pointT,pointO]); //savePoint는 t,o 이다
			iteration++;
		}
		var result=new Object();
		var witnessPoints=GJK.witnessPoints(savePoint,oSave);
		result.point1=witnessPoints[0];
		result.point2=witnessPoints[1];
		result.distance=Vector.length(Vector.sub(result.point1,result.point2));
		//GJK 알고리즘 종료, 충돌판정 및 EPA 알고리즘을 이용하여 충돌데이터를 탐색하기 위한 중요한 정보를 구했다.
		if(result.distance>0){
			return;
		}

		var collisionData=new Object();
		for(var i=0; i<MAX_iteration; i++){ // 몇몇 무한루프 때문에 MAX_intertation 제약을 주었다
			var edge=this.EPA.findClosestEdge(simplexVertex);
			var point=Vector.sub(oV[GJK.support(oV,edge.normal)],tV[GJK.support(tV,Vector.negate(edge.normal))]);
			
			var d=Vector.dotProduct(point,edge.normal);
			if(d-edge.distance<1){
				collisionData.normal=edge.normal;
				collisionData.deph=d;
				collisionData.point=result.point1
				break
			}else{
				simplexVertex.splice(edge.index,0,point);
			}
		}
		if(!collisionData.normal){
			return;
		}
		this.collisionProcessing([t,o],duration,collisionData)
	}
	
	//GJK 알고리즘 구현을 위한 메소드들을 추가한다

	//simplex를 민코스키의 차집합,
	//simplexVertx를 선택한점의 집합으로 정의한다.

	Engine.prototype.collisionProcessing=function(particle,duration,contactData){ //충돌 처리
		var A=this.$particle[particle[0]];
		var B=this.$particle[particle[1]];


		if(typeof this.eventFunc[particle[0]].collision=="function"){
			this.eventFunc[particle[0]].collision.apply(this,[particle[1]])
		}
		if(typeof this.eventFunc[particle[1]].collision=="function"){
			this.eventFunc[particle[1]].collision.apply(this,[particle[0]])
		}

		if(A.contactHandling===false || B.contactHandling===false){
			return
		}	
		this.$checkContact[particle[0]]=true;
		this.$checkContact[particle[1]]=true;
		
		var isBackgroundA=A.inverseMass<=0;
		var isBackgroundB=B.inverseMass<=0;
		if(isBackgroundA){A.a=[0,0]; A.v=[0,0];}
		if(isBackgroundB){B.a=[0,0]; B.v=[0,0];}
		
		
		var totalInverseMass=A.inverseMass+B.inverseMass;

		//충돌데이터와 물체의 질량에 근거하여 위치를 조정한다.
		//(충돌깊이)=(A위치의 변화량)+(B위치의 변화량)
		if(contactData.deph>0 && totalInverseMass>0){
			//역질량을 기준으로하면 여러에러와 연산속도가 빨라진다.
			var totalMove=Vector.multiply(contactData.normal,(contactData.deph/totalInverseMass));
			A.s=Vector.sum(A.s,Vector.multiply(totalMove,A.inverseMass));
			B.s=Vector.sum(B.s,Vector.negate(Vector.multiply(totalMove,B.inverseMass)));
		}
		var separatingV=Vector.dotProduct(Vector.sub(A.v,B.v),contactData.normal);	
		if(separatingV>0){
			return;
		}
		var e=Math.min(A.restitution,B.restitution);
		var newSepV=-separatingV*e;
		var deltaV=newSepV-separatingV;

		//속도의 변화는 속도변화의 총량에 두물체의 질량에 따라 그값이 결정되는데, 역질량을 통하여도 그비율을 알수있다. 장점은 연산속도가 좋아진다
		if(totalInverseMass<=0){ // 둘다 배경이라면
			return;
		}

		var impulse=deltaV/totalInverseMass; // 속도 변화량/AinverseMass+BinverseMass -> 총속도변화량을 질량에 따라 그 비율을 나누기우힌과정이다.
		//거리변화처럼 (여기선 질량을 역질량으로 생각)
		//(A 속도변화)=A.m/(A.m+B.m)*deltaV
		//(B 속도변화)=B.m/(A.m+B.m)*deltaV 

		//운동량은 보존된다.
		impulsePerlMass=Vector.multiply(contactData.normal,impulse);
		
		var deltaVelocityA=Vector.multiply(impulsePerlMass,A.inverseMass);
		var aA=Vector.sum(A.v,deltaVelocityA);
		var deltaVelocityB=Vector.multiply(impulsePerlMass,-B.inverseMass);
		var aB=Vector.sum(B.v,deltaVelocityB);

		A.v=aA;
		B.v=aB;


		//(각도변화)=I^-1*u(충격토크)
		//(충격토크)=Qrel(외적)충격량
		//A.rV+=Vector.cross(Vector.normalize(Vector.sub(contactData.point,this.$canvas.$systemValue.EVENT[particle[0]].center)),Vector.multiply(deltaVelocityA,A.inverseMass))*A.inverseI;
		//B.rV+=Vector.cross(Vector.normalize(Vector.sub(contactData.point,this.$canvas.$systemValue.EVENT[particle[1]].center)),Vector.multiply(deltaVelocityB,B.inverseMass))*B.inverseI;
		
		if(Vector.pow_length(A.v)<1){
			A.isStop=true;			
			A.v=[0,0];
		}
		if(Vector.pow_length(B.v)<1){
			B.isStop=true;			
			B.v=[0,0];
		}


		return;
	}


	Engine.prototype.GJK={
		//support(A-B,D)=support(A,d)-support(B,-d)
		//정점들 중 방향벡터 d로부터 가장멀리있는 정점을 반환한다.
		//정점과 방향벡터d 와의 스칼라의 최댓값으로 판단한다
		searchDirection:function(simplex){
			switch(simplex.length){
				case 1:
					return Vector.negate(simplex[0]);
				case 2:
					var edge=Vector.sub(simplex[1],simplex[0]),
						sign=Vector.cross(edge,Vector.negate(simplex[0]));
					if(sign>0)	{return Vector.cross(1,edge);}
					else		{return Vector.cross(edge,1);}
				default:
					return [0,0];
			}
		},
		support:function(C,d){ //supprot가 기존의 정점이면 알고리즘 종료
			var max=-Infinity,
				index=0;
			for(var i=0; i<C.length; i++){
				var value=Vector.dotProduct(C[i],d);
				if(max<value){
					max=value;
					index=i;
				}
			}
			return index;	
		},
		//simplexVertex가 이루고 있는 삼각형의 영역과 (원)점과의 최소거리를 구한다.
		getClosestdata:function(triangle,Q,oSave,saveIndex,savePoint){ 
			if(triangle.length==2){return this.solve2(triangle,Q,oSave,saveIndex,savePoint);}
			//OA=triangle[0]	OB=trinagle[1]	OC=triangle[2]
			var A=Vector.sub(triangle[0],Q),B=Vector.sub(triangle[1],Q),C=Vector.sub(triangle[2],Q),
				//사실 GJK알고리즘실행에 있어서 탐색정점 Q는 전부 [0,0]이다.
				AQ=Vector.negate(A),BQ=Vector.negate(B),CQ=Vector.negate(C);

			var AB=Vector.sub(B,A),BA=Vector.negate(AB),
				BC=Vector.sub(C,B),CB=Vector.negate(BC),
				AC=Vector.sub(C,A),CA=Vector.negate(AC);

			var uAB=Vector.dotProduct(BQ,BA),
				vAB=Vector.dotProduct(AQ,AB),

				uBC=Vector.dotProduct(CQ,CB),
				vBC=Vector.dotProduct(BQ,BC),

				uCA=Vector.dotProduct(AQ,AC),
				vCA=Vector.dotProduct(CQ,CA);


			/*VERTEX REGIONS*/
				if(vAB<=0 && uCA<=0){ // A
					triangle.splice(1);
					saveIndex.splice(1);
					savePoint.splice(1);

					oSave.u=[1];
					oSave.divisor=1;
					return 1; 
				}				
				if(uAB<=0 && vBC<=0){ // B
					triangle[0]=triangle[1];
					saveIndex[0]=saveIndex[1];
					savePoint[0]=savePoint[1];
					triangle.splice(1);
					saveIndex.splice(1);
					savePoint.splice(1);

					oSave.u=[1];
					oSave.divisor=1;

					return 1;
				}
				if(uBC<=0 && vCA<=0){ // C
					triangle[0]=triangle[2];		
					saveIndex[0]=saveIndex[2];
					savePoint[0]=savePoint[2];

					triangle.splice(1);
					saveIndex.splice(1);
					savePoint.splice(1);

					oSave.u=[1];
					oSave.divisor=1;
					return 1;
				}
			/*EDGE  REGIONS*/
				var area=Vector.cross(AB,AC),
					uABC=Vector.cross(B,C),
					vABC=Vector.cross(C,A),
					wABC=Vector.cross(A,B);


				if(uAB>0 && vAB>0 && wABC*area<=0){ // AB

					triangle.splice(2);
					saveIndex.splice(2);
					savePoint.splice(2);

					oSave.u=[uAB,vAB];
					oSave.divisor=Vector.dotProduct(AB,AB);
					return 1;
				}
				if(uBC>0 && vBC>0 && uABC*area<=0){ // BC
					triangle[0]=triangle[1];
					triangle[1]=triangle[2];

					saveIndex[0]=saveIndex[1];
					saveIndex[1]=saveIndex[2];
					
					savePoint[0]=savePoint[1];
					savePoint[1]=savePoint[2];

					triangle.splice(2);
					saveIndex.splice(2);
					savePoint.splice(2);

					oSave.u=[uBC,vBC];
					oSave.divisor=Vector.dotProduct(BC,BC);

					return 1;
				}
				if(uCA>0 && vCA>0 && vABC*area<=0){ // AC
					triangle[1]=triangle[0];
					triangle[0]=triangle[2];

					saveIndex[1]=saveIndex[0];
					saveIndex[0]=saveIndex[2];

					savePoint[1]=savePoint[0];
					savePoint[0]=savePoint[2];

					triangle.splice(2);
					saveIndex.splice(2);
					savePoint.splice(2);

					oSave.u=[uCA,vCA];
					oSave.divisor=Vector.dotProduct(CA,CA);

					return 1;
				}

			/*INTERIOR REGION*/
			//if(uABC>0 && vABC>0 && wABC>0)
			oSave.u=[uABC,vABC,wABC];
			oSave.divisor=area;
			return;
		},
		solve2:function(edge,Q,oSave,saveIndex,savePoint){
			var A=Vector.sub(edge[0],Q),B=Vector.sub(edge[1],Q),
				AQ=Vector.negate(A),BQ=Vector.negate(B)

				u=Vector.dotProduct(BQ,Vector.sub(A,B)),
				v=Vector.dotProduct(AQ,Vector.sub(B,A));
			if(v<=0){ // A
				edge.splice(1);
				saveIndex.splice(1);
				savePoint.splice(1);
				
				oSave.u=[1];
				oSave.divisor=1;

				return 1
			}
			if(u<=0){ // B
				edge[0]=edge[1];
				saveIndex[0]=saveIndex[1];
				savePoint[0]=savePoint[1]
				edge.splice(1);
				saveIndex.splice(1);
				savePoint.splice(1);

				oSave.u=[1];
				oSave.divisor=1;

				return 1
			}
			oSave.u=[u,v];
			var e=Vector.sub(B,A);

			oSave.divisor=Vector.dotProduct(e,e);		
			return 1;
		},
		witnessPoints:function(savePoint,oSave){
			var s=1/oSave.divisor;

			switch(savePoint.length){
				case 1:
					return savePoint[0];
				case 2:
					var uA1=Vector.multiply(savePoint[0][0],s*oSave.u[0]);
					var uB1=Vector.multiply(savePoint[1][0],s*oSave.u[1]);

					var uA2=Vector.multiply(savePoint[0][1],s*oSave.u[0]);
					var uB2=Vector.multiply(savePoint[1][1],s*oSave.u[1]);

					return [Vector.sum(uA1,uB1),Vector.sum(uA2,uB2)];
				case 3:	
					var uA=Vector.multiply(savePoint[0][0],s*oSave.u[0]);
					var uB=Vector.multiply(savePoint[1][0],s*oSave.u[1]);
					var uC=Vector.multiply(savePoint[2][0],s*oSave.u[2]);
					var result=Vector.sum(Vector.sum(uA,uB),uC)
					return [result,result]
			}
		}
	}
	//EPA 알고리즘 실행을 위한 함수
	Engine.prototype.EPA={
		findClosestEdge:function(simplex){
			var result={
				distance:Infinity,
				normal:new Array(),
				index:NaN
			};
			for(var i=0; i<simplex.length; i++){
				var n=(i+1==simplex.length)	 ? 0 : i+1;
				var A=simplex[i],B=simplex[n];
				var E=Vector.sub(B,A);
				//원점에서 부터 벡터A까지의 벡터를 불러오지만 원점은 [0,0] 이므로 무의미하다.
				
				var normal=Vector.normalize(Vector.sub(Vector.multiply(A,Vector.dotProduct(E,E)),Vector.multiply(E,Vector.dotProduct(A,E))))
				//tripleProduct(A,B,C)= B(A.dot(C))-A(B.dot(C))
			
				var distance=Vector.dotProduct(normal,A);
				if(distance<result.distance){
					result.distance=distance;
					result.normal=normal;
					result.index=n;
				}
			}
			return result;
		}
	}
	/*벡터 합수 접근성의 용이함을 위해 window.Vector로 선언한다.*/
	window.Vector={
		isVector:function(val){
			if(Object.prototype.toString.call( val ) === '[object Array]' && val.length==2){
				val[0]=Number(val[0]);
				val[1]=Number(val[1]);
				if(isNaN(val[0]) || isNaN(val[1])){
					return;
				}
				return val;
			}
			return;
		},
		sum:function(v1,v2){
			return [v1[0]+v2[0],v1[1]+v2[1]];
		},
		sub:function(v1,v2){
			return [v1[0]-v2[0],v1[1]-v2[1]];
		},
		multiply:function(v,a){ // 실수곱
			return [v[0]*a,v[1]*a];
		},
		dotProduct:function(v1,v2){ // 두벡터의 내적
			return v1[0]*v2[0]+v1[1]*v2[1];
		},
		normalize:function(v){ // 정규화(단위벡터)
			var l=Vector.length(v);
			return l===0 ? [0,0] : [v[0]/l,v[1]/l];
		},
		length:function(v){ // 벡터의 길이(크기)
			return Math.sqrt(v[0]*v[0]+v[1]*v[1])
		},
		pow_length:function(v){
			return v[0]*v[0]+v[1]*v[1];
		},
		reverse:function(val){
			return [val[1],val[0]]
		},
		distance:function(a,b){
			return Vector.length(Vector.sub(a,b))
		},
		cross:function(a,b){//2d 에서의 외적
			var A=Vector.isVector(a),B=Vector.isVector(b);
			if(A && B){
				return a[0]*b[1]-a[1]*b[0]
			}else if(A && !B){
				return [a[1]*b,a[0]*-b]
			}else if(!A && B){
				return [b[1]*-a,b[0]*a]
			}
		},
		negate:function(a){
			return Vector.multiply(a,-1);
		}
	}

})(window);