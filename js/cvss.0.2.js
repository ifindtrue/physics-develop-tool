/************************************************************************
CVSS javascript Libaray - Version 0.2
made by
*************************************************************************/
(function(window){
	window.Canvas=function Canvas(/*optional*/id,callback){
		if(typeof id=="string"){
			this.target(id);
			if(typeof callback=="function"){
				callback.apply(this,[]);
			}
		}
	}
	Canvas.prototype.target=function(name){
		var canvas=document.getElementById(name.substring(1)) //#(맨 앞글자)을 제외한다.
			,context=canvas.getContext("2d");

		if(context){
			this.$canvas=canvas;
			this.$context=context;
			this.$element={}; //현재 등록된 엘레먼트의 정보를 보관한다.
			this.$elementKey=[]; //zindex에 따라 객체의 순서를 지정해줄 필요가있다
			
			var th=this;

			this.$canvas.addEventListener("mousemove",tempCanvasMouseOver);
			this.$canvas.addEventListener("mousedown",tempCanvasMouseDown);
			this.$canvas.addEventListener("mouseup",tempCanvasMouseUp);
			this.$canvas.addEventListener("mouseout",function(){
				var sys=th.$systemValue;
				if(sys.prevOverElement && sys.eventFunc[sys.prevOverElement] && typeof sys.eventFunc[sys.prevOverElement].mouseout == "function"){sys.eventFunc[sys.prevOverElement].mouseout.apply(th,[NaN,sys.prevOverElement]);}
				else if(sys.prevOverElement && th.$element[sys.prevOverElement] && th.$element[sys.prevOverElement].baseEventElement && sys.eventFunc[th.$element[sys.prevOverElement].baseEventElement] && typeof sys.eventFunc[th.$element[sys.prevOverElement].baseEventElement].mouseout=="function"){sys.eventFunc[th.$element[sys.prevOverElement].baseEventElement].mouseout.apply(th,[NaN,sys.prevOverElement]);}

				if(sys.dragOn && sys.eventFunc[sys.dragElement] && typeof sys.eventFunc[sys.dragElement].drop=="function"){
					sys.eventFunc[sys.dragElement].drop.apply(th,[NaN,sys.dragElement]);
				}else if(sys.dragOn && th.$element[sys.dragElement].baseEventElement && th.$element[sys.dragElement].baseEventElement && sys.eventFunc[th.$element[sys.dragElement].baseEventElement] && typeof sys.eventFunc[th.$element[sys.dragElement].baseEventElement].drop=="function"){
					sys.eventFunc[th.$element[sys.dragElement].baseEventElement].drop.apply(th,[NaN,sys.dragElement]);
				}
				sys.prevOverElement=undefined;
				th.$canvas.style.cursor="default";
				sys.dragOn=false;
				sys.prevEventElement=undefined;
				sys.prevEventType=undefined;
			});

			function tempCanvasMouseOver(event){th.detectMOUSEMOVE(event);}
			function tempCanvasMouseDown(event){th.detectMOUSEDU(event,"mousedown");}
			function tempCanvasMouseUp(event){th.detectMOUSEDU(event,"mouseup");}
			this.$canvas.onselectstart=function(){return false};

			this.$systemValue={
				prevOverElement:undefined,
				prevEventElement:undefined,
				prevEventType:undefined,
				dblclickTimer:false,
				dblclickTimerFunc:undefined,
				dragOn:false,
				dragElement:undefined,
				eventFunc:{},//객체{이벤트 타입:함수}
				EVENT:{},//block 이나 polygon의 점들의 좌표를 보관한다.
				imageData:[],
				imageSrc:[],
				imageDataMatch:{},
				STACK:[],
				rotateCenter:false,//질량중심회전
				elementType:["block","polygon","circle","text"],
				elementEventType:["mouseup","mousedown","click","mousein","mouseout","dblclick","dragstart","drag","drop","mousemove"],
				backgroundRepeatType:["no-repeat","repeat","repeat-y","repeat-x"],
				lineJoinType:["bevel","round","miter"],
				transform:{
					scale:[1,1]
				},
				boundingBox:{}
			}
		}else{
			console.warn("CvSS ERROR : "+name+" 캔버스를 찾을 수 없습니다.");
			return;
		}
	}
	Canvas.prototype.polygonInsideCheck=function(pointer,vertexInfo){
		var length=typeof vertexInfo=="object" ? vertexInfo.length : 0;
		if(length<=2){
			return 0;
		}
		var direct=[0,0],i,temp;
		for(i=0; i<length; i++){
			if(i==length-1){
				temp=0;
			}else{
				temp=i+1;
			}
			if((vertexInfo[i][1]<pointer.y && pointer.y<=vertexInfo[temp][1]) || (vertexInfo[temp][1]<pointer.y && pointer.y<=vertexInfo[i][1])){
				if((-pointer.y+vertexInfo[i][1])*(vertexInfo[temp][0]-vertexInfo[i][0])/(-vertexInfo[temp][1]+vertexInfo[i][1])+vertexInfo[i][0]<=pointer.x){
					direct[0]++;			
				}else{
					direct[1]++;
				}
			}
		}
		if(direct[0]%2==1 && direct[1]%2==1){
			return 1;
		}
		return 0;
	}
	Canvas.prototype.detectMOUSEMOVE=function(event){
		var e=this.getRealMousePosition(event),i,j,
			sys=this.$systemValue,insideCheck=false,element;

		if(sys.prevEventType=="mousedown"){ // 드래그판정
			if(sys.dragOn===false){
				sys.dragOn=true;
				sys.dragElement=sys.prevEventElement;
				var tempElement=this.$element[sys.dragElement];
				if(tempElement.type=="block"){
					e.origin=[e.x-tempElement.$x,e.y-tempElement.$y];
				}
				if(sys.eventFunc[sys.dragElement] && typeof sys.eventFunc[sys.dragElement].dragstart=="function"){
					sys.eventFunc[sys.dragElement].dragstart.apply(this,[e,sys.dragElement]);
				}else if(this.$element[sys.dragElement].baseEventElement && sys.eventFunc[this.$element[sys.dragElement].baseEventElement] && typeof sys.eventFunc[this.$element[sys.dragElement].baseEventElement].dragstart=="function"){
					sys.eventFunc[this.$element[sys.dragElement].baseEventElement].dragstart.apply(this,[e,sys.dragElement]);
				}
			}else{
				var tempElement=this.$element[sys.dragElement];
				if(tempElement.type=="block"){
					e.origin=[e.x-tempElement.$x,e.y-tempElement.$y];
				}
				if(sys.eventFunc[sys.dragElement] && typeof sys.eventFunc[sys.dragElement].drag=="function"){
					sys.eventFunc[sys.dragElement].drag.apply(this,[e,sys.dragElement]);
				}else if(this.$element[sys.dragElement].baseEventElement && sys.eventFunc[this.$element[sys.dragElement].baseEventElement] && typeof sys.eventFunc[this.$element[sys.dragElement].baseEventElement].drag=="function"){
					sys.eventFunc[this.$element[sys.dragElement].baseEventElement].drag.apply(this,[e,sys.dragElement]);
				}
			}
		}
		for(i=this.$elementKey.length-1; i>=0; i--)
		{
			element=this.$element[this.$elementKey[i]];
			if(element.show===false || element.onlyBaseElement===true){continue;}
			var tempE=sys.EVENT[this.$elementKey[i]];
			switch(element.type){
				case "block":
				case "polygon":
					insideCheck=Canvas.prototype.polygonInsideCheck({x:e.x,y:e.y},tempE.vertex);
					break;
				case "circle":
					var c=sys.EVENT[this.$elementKey[i]].c,a=sys.EVENT[this.$elementKey[i]].a;
					if(Math.sqrt(Math.pow(e.x-c.x,2)+Math.pow(e.y-c.y,2))+Math.sqrt(Math.pow(e.x-c.mirrorx,2)+Math.pow(e.y-c.mirrory,2))<a*2){
						insideCheck=true;
					}
					break;						
			}
			if(insideCheck){
				var key=this.$elementKey[i];
				if(element.type=="block"){
					e.origin=[e.x-this.$element[key].$x,e.y-this.$element[key].$y]
				}
				this.$canvas.style.cursor=element.cursor || this.$initElement.cursor;
				if(sys.eventFunc[key] && typeof sys.eventFunc[key].mousemove=="function"){sys.eventFunc[key].mousemove.apply(this,[e,key]);
				}else if(this.$element[key].baseEventElement && sys.eventFunc[this.$element[key].baseEventElement] && typeof sys.eventFunc[this.$element[key].baseEventElement].mousemove=="function"){sys.eventFunc[this.$element[key].baseEventElement].mousemove.apply(this,[e,key]);}
				
				if(sys.prevOverElement==key){return;}
				if(sys.prevOverElement && sys.prevOverElement!=key && sys.eventFunc[sys.prevOverElement] && typeof sys.eventFunc[sys.prevOverElement].mouseout == "function"){sys.eventFunc[sys.prevOverElement].mouseout.apply(this,[e,sys.prevOverElement]);}
				else if(sys.prevOverElement && sys.prevOverElement!=key && this.$element[sys.prevOverElement].baseEventElement && sys.eventFunc[this.$element[sys.prevOverElement].baseEventElement] && typeof sys.eventFunc[this.$element[sys.prevOverElement].baseEventElement].mouseout=="function"){sys.eventFunc[this.$element[sys.prevOverElement].baseEventElement].mouseout.apply(this,[e,sys.prevOverElement]);}
				sys.prevOverElement=key; 
				if(sys.eventFunc[key] && typeof sys.eventFunc[key].mousein == "function"){sys.eventFunc[key].mousein.apply(this,[e,key]);}
				else if(element.baseEventElement && sys.eventFunc[element.baseEventElement] && typeof sys.eventFunc[element.baseEventElement].mousein=="function"){sys.eventFunc[element.baseEventElement].mousein.apply(this,[e,key]);}			
				return;
			}
		}
		if(sys.prevOverElement && sys.eventFunc[sys.prevOverElement] && typeof sys.eventFunc[sys.prevOverElement].mouseout == "function"){sys.eventFunc[sys.prevOverElement].mouseout.apply(this,[e,sys.prevOverElement]);}
		else if(sys.prevOverElement && this.$element[sys.prevOverElement] && this.$element[sys.prevOverElement].baseEventElement && sys.eventFunc[this.$element[sys.prevOverElement].baseEventElement] && typeof sys.eventFunc[this.$element[sys.prevOverElement].baseEventElement].mouseout=="function"){sys.eventFunc[this.$element[sys.prevOverElement].baseEventElement].mouseout.apply(this,[e,sys.prevOverElement]);}
		sys.prevOverElement=undefined;
		this.$canvas.style.cursor="default";
	}
	Canvas.prototype.detectMOUSEDU=function(event,type){
		var e=this.getRealMousePosition(event),i,
			insideCheck=false,j,element,sys=this.$systemValue;
		if(type=="mouseup" && sys.dragOn){
			sys.dragOn=false;
			if(sys.eventFunc[sys.dragElement] && typeof sys.eventFunc[sys.dragElement].drop=="function"){
				sys.eventFunc[sys.dragElement].drop.apply(this,[e,sys.dragElement]);
			}else if(this.$element[sys.dragElement].baseEventElement && this.$element[sys.dragElement].baseEventElement && sys.eventFunc[this.$element[sys.dragElement].baseEventElement] && typeof sys.eventFunc[this.$element[sys.dragElement].baseEventElement].drop=="function"){
					sys.eventFunc[this.$element[sys.dragElement].baseEventElement].drop.apply(this,[NaN,sys.dragElement]);
			}
		}
		for(i=this.$elementKey.length-1; i>=0; i--){
			element=this.$element[this.$elementKey[i]];
			if(element.show===false || element.onlyBaseElement===true){continue;}
			var tempE=sys.EVENT[this.$elementKey[i]];
			switch(element.type){
				case "block":
				case "polygon":
					insideCheck=Canvas.prototype.polygonInsideCheck({x:e.x,y:e.y},tempE.vertex);
					break;
				case "circle":
					var c=sys.EVENT[this.$elementKey[i]].c,a=sys.EVENT[this.$elementKey[i]].a;
					if(Math.sqrt(Math.pow(e.x-c.x,2)+Math.pow(e.y-c.y,2))+Math.sqrt(Math.pow(e.x-c.mirrorx,2)+Math.pow(e.y-c.mirrory,2))<a*2){
						insideCheck=true;
					}
					break;				
			}
			if(insideCheck){
				if(element.type=="block"){
					e.origin=[e.x-this.$element[this.$elementKey[i]].$x,e.y-this.$element[this.$elementKey[i]].$y]
				}
				if(type=="mousedown" && sys.prevEventElement!=this.$elementKey[i]){
					clearTimeout(sys.dblclickTimerFunc);
					sys.dblclickTimer=false;
				}					
				if(type=="mouseup" && sys.prevEventElement==this.$elementKey[i] && sys.prevEventType=="mousedown"){
					type="click";
					sys.dblclickTimerFunc=setTimeout(function(){sys.dblclickTimer=false;},500);						
					if(sys.dblclickTimer==true){
						clearTimeout(sys.dblclickTimerFunc);
						sys.dblclickTimer=false;
						type="dblclick";
					}else{
						var th=this;
						sys.dblclickTimer=true;
						sys.dblclickTimerFunc=setTimeout(function(){sys.dblclickTimer=false;},500);						
					}
				}

				sys.prevEventElement=this.$elementKey[i];
				sys.prevEventType=type;
				this.$canvas.style.cursor=element.cursor || this.$initElement.cursor;	
				if(sys.eventFunc[this.$elementKey[i]] && typeof sys.eventFunc[this.$elementKey[i]][type] == "function"){sys.eventFunc[this.$elementKey[i]][type].apply(this,[e,this.$elementKey[i]]);}
				else if(element.baseEventElement && sys.eventFunc[element.baseEventElement] && typeof sys.eventFunc[element.baseEventElement][type]=="function"){sys.eventFunc[element.baseEventElement][type].apply(this,[e,this.$elementKey[i]]);}
				return;
			}
		}
		sys.prevEventElement=undefined;
		sys.prevEventType=undefined;
	}
	Canvas.prototype.getRealMousePosition=function(event){
		var mouseX,mouseY
		var e=event.originalEvent || event,
			canvas=event.currentTraget || event.srcElement,
			boundingRect=canvas.getBoundingClientRect();
		if(e.touches){
			mouseX=e.touches[0].clientX-boundingRect.left;
			mouseY=e.touches[0].clientY-boundingRect.top;
		}else{
			mouseX=e.clientX-boundingRect.left;
			mouseY=e.clientY-boundingRect.top;
		}
		return{
			x:parseInt(mouseX),
			y:parseInt(mouseY)
		}
	}
	//numberFormat함수는 문자열 형식의 숫자를 입력받으면 이를 순수한 숫자로 반환한다.
	//또한 previous_val을 통하여 이전 값에 현재값을 더하거나 빼는 증감연산자를 사용할수 있다.
	Canvas.prototype.numberFormat=function(val,previousVal,initVal,px){
		if(isNaN(previousVal)){//previousVal이 올바른 숫자가 아니면 initVal로 대채한다.
			previousVal=initVal;
		}
		if(typeof val =="string"){
			if(val.substring(val.length-2)=="px" && px!==false){ //px이 false라면 Npx 형식을 지원하지않는다.
				val=val.substring(0,val.length-2);
			}
			switch(val.substring(0,2)){
				case "+=":val=Number(previousVal)+Number(val.substring(2)); break;
				case "-=":val=Number(previousVal)-Number(val.substring(2)); break;
			}
			val=Number(val);
		}
		return isNaN(val) ? initVal : val;
	}

	Canvas.prototype.persentFormat=function(size,val,initVal){
		var front=new String();
		if(typeof val=="string" && (val.substring(0,2)=="+=" || val.substring(0,2)=="-=")){
			front=val.substring(0,2);
			val=val.substring(2);
		}
		switch(typeof val){
			case "string":
				if(val.substring(val.length-2,val.length)=="px"){
					val=Number(val.substring(0,val.length-2)) || initVal;
				}else if(val.substring(val.length-1,val.length)=="%"){
					val=(size/100)*Number(val.substring(0,val.length-1)) || initVal;
				}else{
					val=Number(val) || initVal;
				}
				break;
			case "number":break;
			default: val=initVal;
		}
		return front=="" ? val : front+val;
	}
	Canvas.prototype.setBaseObj=function(baseObj,newObj,sub,baseElementCheck,sortList){
		var key=Object.keys(newObj),
			r=Canvas.prototype.CopyObj(baseObj);
		if(baseElementCheck && sub){delete r.onlyBaseElement}
		for(var i=0; i<key.length; i++){
			var newKey=key[i];

			if(!sub && (!r[newKey] || newObj[newKey].zindex!=r[newKey].zindex) && sortList){ sortList.push(newKey)}

			//불른 형식으로 타입이결정되는 객체는 제외 show가안되는이유는 onlybaseelement에서막혔기 때문이다.
			if(sub && newKey!="onlyBaseElement" && newKey!="show" && (newObj[newKey]=="none" || (typeof newObj[newKey]!="number" && !newObj[newKey]))){
				if(!baseElementCheck){
					delete r[newKey];
					r.$temp=true;
				}
				continue;
			}else{
				r[newKey]=newObj[newKey];
				if(sub){
					r.$temp=true;
				}else{
					r[newKey].$temp=true;
				}
			}
		}
		return r;
	}

	Canvas.prototype.drawElement=function (info,/*optional*/option){
		//매개변수로 받은 엘레먼트 정보를 가공한다
			if(!info){ //info가 없으면 리턴
				return;
			}else if(typeof info=="string" || typeof info=="number"){ 
				var name=info;
				if(typeof option=="object"){ //drawElement(엘레먼트이름,{속성:...})
					info={};
					info[name]=Canvas.prototype.setBaseObj(this.$element[name],option,true);	
				}else{
					return;
				}
			}else if(typeof info!="object"){
				return;
			}
		var C=this.$context;
		var sortList=[]; // 새로 추가되는 이름의 객체와 zindex 변경이 있는객체를 등록한다.
		info=Canvas.prototype.setBaseObj(this.$element,info,false,false,sortList); // 이전 정보에 현재 정보를 합침
		//이전 엘레먼트에 현재 입력받 정보를 덮어씌기한다.
		C.clearRect(0,0,this.$canvas.width,this.$canvas.height); // 캔버스를 지운다
		
		var element,imgObj=[],imgInfo=[],
			initElement=this.$initElement, // the initial value of cvssElement
			numberFormat=this.numberFormat,
			persentFormat=this.persentFormat,
			sys=this.$systemValue;

		for(var i=0; i<sortList.length; i++){
			var value=sortList[i],apply=false,index=this.$elementKey.indexOf(value);
			if(this.$elementKey.length==0){
				this.$elementKey.push(value);
				continue;
			}
			if(index!==-1){
				this.$elementKey.splice(index,1);
			}

			var f=0,l=this.$elementKey.length,MAXcount=l,count=0;
			while( f < l ){
				if(count>MAXcount){break}
				var mid=parseInt((f+l)/2);
				if((info[this.$elementKey[mid]].zindex || 0)==(info[value].zindex || 0)){
					this.$elementKey.splice(mid,0,value);
					apply=true;
					break;
				}
				else if((info[this.$elementKey[mid]].zindex || 0)>(info[value].zindex || 0)){
					l=mid-1;
				}else{
					f=mid+1;
				}
				count++;
			}
			if(apply){
				continue;
			}
			//f>1이라는건 f가 다가온것, 즉 mid가 작다는것, zindex정렬은 값이 클수록 오른쪽으로(index가 큰순으로) 정령되어야하므로 f>l 이면 f,아닐경우에는 l로
			var pass=mid,length=this.$elementKey.length;
			while(pass<length && (info[this.$elementKey[pass]].zindex || 0 )<(info[value].zindex || 0)){
				pass++;
			} 
			this.$elementKey.splice(pass,0,value);
		}
		var K=this.$elementKey; //$elementKey에 정렬된 key순서를 적용한다, 다른 함수(이벤트함수)에서도 엘레먼트의 출력순서는 꼭 필요하다

		var patterns=sys.backgroundRepeatType; //block속성 중 background기능에서 repeat의 허용범위를 지정해준 배열을 불러온다.
		C.scale(sys.transform.scale[0],sys.transform.scale[1]); // 화면

		for(var i=0; i<K.length; i++){
			var t,x=NaN,y=NaN,width=NaN,height=NaN,temp=NaN,border={width:0,color:0},sourceX=NaN,sourceY=NaN,src=NaN,pattern=NaN,origin=NaN,borderArr=NaN,TempX=NaN,TempY=NaN; //대표적인 속성값을 NaN으로 초기화한다.

			E=info[K[i]];
			$E=this.$element[K[i]];

			C.save();
			if(Object.prototype.toString.call( E.scale ) === '[object Array]' && E.scale.length==2){
				C.scale(E.scale[0],E.scale[1]);
			}
			if(Object.prototype.toString.call( E.translate ) === '[object Array]' && E.translate.length==2){
				C.translate(E.translate[0],E.translate[1]);
			}
			if(Object.prototype.toString.call( E.skew ) === '[object Array]' && E.skew.length==2){
				//E.scale=[initElement.skew[0],initElement.skew[1]]
			}


			//C.scale(E.scale[0],E.scale[1]);

			if(typeof E.baseElement=="string" && ($E && $E.baseElement)!=E.baseElement){
				E.baseStyleElement=($E && $E.baseStyleElement)==E.baseStyleElement ? E.baseElement : E.baseStyleElement;
				E.baseEventElement=($E && $E.baseEventElement)==E.baseEventElement ? E.baseElement : E.baseEventElement;
			}
			if(typeof E.baseStyleElement=="string" && typeof info[E.baseStyleElement]=="object"){
				E=Canvas.prototype.setBaseObj(info[E.baseStyleElement],E,true,true);
			}
			if(sys.elementType.indexOf(E.type) == -1){
				E.type=initElement.type;
			}
			E.opacity=numberFormat(E.opacity,$E && $E.opacity || 0,initElement.opacity);
			C.globalAlpha=E.opacity;
			if(!sys.EVENT[K[i]]){
				sys.EVENT[K[i]]={};
			}
			event=sys.EVENT[K[i]];
			var applyNewProperty=E.$temp || !$E;
			
			//공통 속성
			if(applyNewProperty){
				if((!$E && typeof E.border=="string")|| typeof E.border=="string" && ($E && $E.border!=E.border)){
					borderArr=E.border.split(" ");
					border.width=numberFormat(borderArr[0],0,initElement.borderWidth);
						C.lineWidth=border.width;
					border.color=borderArr[2] || initElement.borderColor;
						C.strokeStyle=border.color;
				}
				if(!border.width){
					border.width=numberFormat(E.borderWidth,($E && $E.borderWidth)||0,initElement.borderWidth);
					C.lineWidth=border.width;
				}
				if(!border.color){
					border.color=E.borderColor || initElement.borderColor;
					C.strokeStyle=border.color;
				}

				E.borderWidth=border.width;
				E.borderColor=border.color;
				E.border=border.width+" solid "+border.color;
			}
			x=numberFormat(persentFormat(this.$canvas.width,E.x,initElement.x),($E && $E.x),initElement.x);
			y=numberFormat(persentFormat(this.$canvas.height,E.y,initElement.y),($E && $E.y),initElement.y);	
			switch(E.type){
				case "block":
					width=numberFormat(persentFormat(this.$canvas.width,E.width,initElement.width),($E && $E.width) || 0,initElement.width);
					height=numberFormat(persentFormat(this.$canvas.height,E.height,initElement.height),($E && $E.height) || 0,initElement.height);
				
					if(E.minWidth){
						E.minWidth=numberFormat(persentFormat(this.$canvas.width,E.minWidth,0),($E && $E.minWidth) || 0,0);
						width=E.minWidth<E.width ? E.width : E.minWidth;
					}
					if(E.maxWidth){
						E.maxWidth=numberFormat(persentFormat(this.$canvas.width,E.maxWidth,width),($E && $E.maxWidth) || 0,width);
						width=E.maxWidth<width ? E.maxWidth : width;
					}
					
					if(E.minHeight){
						E.minHeight=numberFormat(persentFormat(this.$canvas.height,E.minHeight,0),($E && $E.minHeight) || 0,0);
						height=E.minHeight<E.height ? E.height :E.minHeight;
					}
					if(E.maxHeight){
						E.maxHeight=numberFormat(persentFormat(this.$canvas.height,E.maxHeight,height),($E && $E.maxHeight) || 0,height);
						height=E.maxHeight<height ? E.maxHeight: height;
					}
					C.fillStyle=E.background ? E.background: initElement.background;
					
					origin=typeof E.origin=="string" ? E.origin.split(" ") : initElement.origin;
						x-=numberFormat(persentFormat(width,origin[0],initElement.origin[0]),0,initElement.origin[0]);
						y-=numberFormat(persentFormat(height,origin[1],initElement.origin[1]),0,initElement.origin[0]);

					if(applyNewProperty){
						if(E.backgroundImageSrc){
							E.backgroundImagePattern=patterns.indexOf(E.backgroundImagePattern)!=-1 ? E.backgroundImagePattern : initElement.backgroundImagePattern;
							E.backgroundImageX=numberFormat(E.backgroundImageX,($E && $E.backgroundImageX)||0,initElement.backgroundImageX);
							E.backgroundImageY=numberFormat(E.backgroundImageY,($E && $E.backgroundImageY)||0,initElement.backgroundImageY);

							src=E.backgroundImageSrc;
							pattern=E.backgroundImagePattern;
							sourceX=E.backgroundImageX;
							sourceY=E.backgroundImageY;				
						}

						event.area=width*height;
						event.center=[x+width/2,y+height/2];
						if(E.rotate){ //transform
							E.rotate=numberFormat(E.rotate,$E && $E.rotate,initElement.rotate,false);
							if(sys.rotateCenter===true){
								E.rotateOriginX=width/2;
								E.rotateOriginY=height/2;
							}else{
								E.rotateOriginX=numberFormat(persentFormat(width,E.rotateOriginX,initElement.rotateOriginX),($E && $E.rotateOriginX),initElement.rotateOriginX);
								E.rotateOriginY=numberFormat(persentFormat(height,E.rotateOriginY,initElement.rotateOriginY),($E && $E.rotateOriginY),initElement.rotateOriginY);
							}
							var cos=Math.cos(E.rotate);
							var sin=Math.sin(E.rotate);

							//x+rotateOriginX
							event.vertex=[[-E.rotateOriginX*cos+E.rotateOriginY*sin+x+E.rotateOriginX,-E.rotateOriginX*sin-E.rotateOriginY*cos+y+E.rotateOriginY],[(width-E.rotateOriginX)*cos+E.rotateOriginY*sin+x+E.rotateOriginX,(width-E.rotateOriginX)*sin-E.rotateOriginY*cos+y+E.rotateOriginY],[(width-E.rotateOriginX)*cos-(height-E.rotateOriginY)*sin+x+E.rotateOriginX,(width-E.rotateOriginX)*sin+(height-E.rotateOriginY)*cos+y+E.rotateOriginY],[-E.rotateOriginX*cos-(height-E.rotateOriginY)*sin+x+E.rotateOriginX,-E.rotateOriginX*sin+(height-E.rotateOriginY)*cos+y+E.rotateOriginY]];	
						}else{
							event.vertex=[[x,y],[x+width,y],[x+width,y+height],[x,y+height]];	
						}
					}else{
						if(E.backgroundImageSrc){
							sourceX=E.backgroundImageX;
							sourceY=E.backgroundImageY;
							pattern=E.backgroundImagePattern;
							src=E.backgroundImageSrc;
						}
					}
					E.$x=x;
					E.$y=y;								
					if(E.backgroundImageSrc){
						var index=sys.imageSrc.indexOf(src);
						if(index == -1){
							var image=new Image(),th=this;
							image.onload=function(){
								sys.imageData.push(this);
								sys.imageSrc.push(this.src);
								sys.imageDataMatch[K[i]]=sys.imageData.length-1;
								th.drawElement(th.$element);
							};
							image.src=src;
							E.$backgroundImage={
								width:NaN,height:NaN
							};
						}else{
							var img=sys.imageData[index],w=width<img.width ? width : img.width,h=height<img.height ? height : img.height;
							E.$backgroundImage={
								width:img.width,height:img.height
							};
						}
					}
					if(E.show===false || E.show=="false"){
						E.show=false;
						this.$element[K[i]]=E;
						C.restore();
						continue;												
					}
					if( E.onlyBaseElement===true || E.onlyBaseElement=="true"){
						E.onlyBaseElement=true;
						this.$element[K[i]]=E;
						C.restore();
						continue;												
					}
					
					if(E.rotate){
						C.translate(x+E.rotateOriginX,y+E.rotateOriginY)
						x=-E.rotateOriginX;y=-E.rotateOriginY;
						C.rotate(E.rotate);
					}
					if(E.borderWidth>0){
						C.strokeRect(x-E.borderWidth/2,y-E.borderWidth/2,width+E.borderWidth,height+E.borderWidth);
					}
					C.fillRect(x,y,width,height);
					
					if(E.backgroundImageSrc && index!==-1){
						if(pattern=="no-repeat"){
							var tempsourcex=0,tempsourcey=0,tempsourcewidth=w,tempsourceheight=h,tempx=x+sourceX,tempy=y+sourceY;
							if(sourceX<0){
								tempsourcex=-sourceX;
								tempsourcewidth=w;
								tempx=x;
							}else if(sourceX+img.width>width){
								tempsourcex=0;
								tempsourcewidth=width-sourceX;
							}
							if(sourceY<0){
								tempsourcey=-sourceY;
								tempsourceheight=h;
								tempy=y;
							}else if(sourceY+img.height>height){
								tempsourcey=0;
								tempsourceheight=height-sourceY;
							}
							C.drawImage(img,tempsourcex,tempsourcey,tempsourcewidth,tempsourceheight,tempx,tempy,tempsourcewidth,tempsourceheight);
						}else if(pattern=="repeat"){
							var countx=Math.ceil(width/img.width),county=Math.ceil(height/img.height),count=countx*county,rw=width%img.width,rh=height%img.height;
							for(j=1; j<=count; j++){
								if(j==count){
									C.drawImage(img,0,0,rw,rh,x+(countx-1)*w,y+(county-1)*h,rw,rh);
								}else if(j%countx==0){
									C.drawImage(img,0,0,rw,h,x+(countx-1)*w,y+parseInt((j-1)/countx)*h,rw,h);
								}else if(j>(county-1)*countx){
									C.drawImage(img,0,0,w,rh,x+(parseInt((j-1)%countx))*w,y+(county-1)*h,w,rh);
								}else{
									C.drawImage(img,0,0,w,h,x+((j%countx)-1)*w,y+parseInt((j-1)/countx)*h,w,h);											
								}
							}
						}else{
							var count,rw,rh,px,py;
							switch(pattern){
								case "repeat-x":count=parseInt(width/img.width),rw=width%img.width,rh=height<img.height ? height : img.height,px=img.width,py=0,w=width<img.width ? width : img.width;
									break;
								case "repeat-y":count=parseInt(height/img.height),rh=height%img.height,rw=width<img.width ? width : img.width,px=0,py=img.height,h=height<img.height ? height : img.height;
									break;
							}
							for(j=0; j<=count; j++){
								if(j==count){
									C.drawImage(img,0,0,rw,rh,x+j*px,y+j*py,rw,rh);
									continue;
								}
								C.drawImage(img,0,0,w,h,x+j*px,y+j*py,w,h);
							}		
						}
					}
					break;
				case "polygon":
					if(applyNewProperty){
						E.borderWidth=border.width;
						E.borderColor=border.color;
						E.border=border.width+" solid "+border.color;
						event.vertex=[];
						if(sys.lineJoinType.indexOf(E.lineJoin)===-1){
							E.lineJoin=initElement.lineJoin;
						}
						C.lineJoin=E.lineJoin
						if(E.vertex && typeof E.vertex=="object"){
							var pass=0;
							C.beginPath();
							
							if(isNaN(Number(E.vertex[0][0])) || isNaN(Number(E.vertex[0][0]))){
								pass=1;
							}else{
								event.vertex[0]=[0,0];

								for(j=0; j<E.vertex.length; j++){
									if(Object.prototype.toString.call( E.vertex[j] ) !== '[object Array]' || isNaN(Number(E.vertex[j][0])) || isNaN(Number(E.vertex[j][1]))){
										pass=0;
										break;
									}

									E.vertex[j][0]=numberFormat(E.vertex[j][0],0,0);
									E.vertex[j][1]=numberFormat(E.vertex[j][1],0,0);

									event.vertex[j+1]=[
										E.vertex[j][0],
										E.vertex[j][1]
									];
									
									//C.lineTo(E.vertex[j][0],E.vertex[j][1]);
								}
							

								C.translate(x,y); //좌표이동
								
								//회전에 관해 보정및 출력
								//AREA를 구합니다
								var area=0,temp,center=[0,0];
								for(j=0; j<event.vertex.length; j++){
									temp=(j==event.vertex.length-1) ? 0 : j+1;
									area+=(event.vertex[j][0]+event.vertex[temp][0])*(event.vertex[j][1]-event.vertex[temp][1])
								}
								area=Math.abs(area)/2;
								for(j=0; j<event.vertex.length; j++){
									temp=(j==event.vertex.length-1) ? 0 : j+1;
									center[0]+=(event.vertex[j][0]+event.vertex[temp][0])*(event.vertex[j][0]*event.vertex[temp][1]-event.vertex[temp][0]*event.vertex[j][1]);
									center[1]+=(event.vertex[j][1]+event.vertex[temp][1])*(event.vertex[j][0]*event.vertex[temp][1]-event.vertex[temp][0]*event.vertex[j][1]);							
								}
								center[0]/=-6*area;
								center[1]/=-6*area;
								
								event.area=area;
								event.center=center;

								if(E.rotate){

									E.rotate=numberFormat(E.rotate,$E && $E.rotate,initElement.rotate,false);
									var cos=Math.cos(E.rotate);
									var sin=Math.sin(E.rotate);
									
									event.vertex[0][0]=-center[0]*cos+center[1]*sin+center[0];
									event.vertex[0][1]=-center[0]*sin-center[1]*cos+center[1];

									C.moveTo(event.vertex[0][0],event.vertex[0][1])
									event.vertex[0][0]+=x;
									event.vertex[0][1]+=y;
									for(j=0; j<event.vertex.length-1; j++){
										event.vertex[j+1][0]=(E.vertex[j][0]-center[0])*cos-(E.vertex[j][1]-center[1])*sin+center[0];
										event.vertex[j+1][1]=(E.vertex[j][0]-center[0])*sin+(E.vertex[j][1]-center[1])*cos+center[1];
										C.lineTo(event.vertex[j+1][0],event.vertex[j+1][1])
										event.vertex[j+1][0]+=x;
										event.vertex[j+1][1]+=y;
									}
								}else{
									C.moveTo(0,0);
										event.vertex[0][0]=x;
										event.vertex[0][1]=y;

									for(j=0; j<event.vertex.length-1; j++){
										event.vertex[j+1][0]+=x;
										event.vertex[j+1][1]+=y;
										C.lineTo(E.vertex[j][0],E.vertex[j][1]);
									}
								}
							}
							C.closePath();
							if(pass==0){
								if(E.background){
									C.fillStyle=E.background;
									C.fill();
								}
								C.stroke();
							}
							E.x=x;
							E.y=y;
						}
					}else{							
						C.beginPath();
						C.lineJoin=E.lineJoin

						for(j=0; j<(event.vertex && event.vertex.length) || 0; j++){
							C.lineTo(event.vertex[j][0],event.vertex[j][1]);
						}
						C.closePath();
						if(E.background){
							C.fillStyle=E.background;
							C.fill();
						}
						C.stroke();
					}
					break;
				case "circle":
					if(applyNewProperty){
						x=x;
						y=y;

						E.r=numberFormat(E.r,($E && $E.r),initElement.r);

						if(!E.start){
							E.start=initElement.start;
						}
						if(!E.end){
							E.end=initElement.end;
						}
						if(!E.clock){
							E.clock=initElement.clock;
						}

						origin=typeof E.origin=="string" ? E.origin.split(" ") : initElement.origin;
						x-=persentFormat(E.r*2,origin[0],initElement.origin[0]);
						y-=persentFormat(E.r*2,origin[1],initElement.origin[1]);

						C.beginPath();
						C.arc(x,y,E.r,E.start,E.end,E.clock);
						if(E.background){C.fillStyle=E.background; C.fill();}
						if(E.borderWidth>0){C.stroke();}

						if(typeof event.c!="object"){
							event.c={};
						}
						event.c.x=x;
						event.c.y=y;
						event.c.mirrorx=x;
						event.c.mirrory=y;
						event.a=E.r;
						event.mirror=true;

						E.$x=x;
						E.$y=y;

					}else{
						C.beginPath();
						C.arc(E.$x,E.$y,E.r,E.start,E.end,E.clock);
						if(E.background){C.fillStyle=E.background; C.fill();}
						if(E.borderWidth>0){C.stroke();}
					}
					break;
				case "text":
					var str=typeof E.content=="string" || typeof E.content=="number" ? E.content : initElement.content;
					E.fontSize=numberFormat(E.fontSize,($E && $E.fontSize),initElement.fontSize);
					var fontTemp=(E.fontSize || initElement.fontSize)+"px "+(E.fontFamily || initElement.fontFamily);
					C.font=fontTemp;
					C.fillStyle=E.color;
					C.textAlign=E.textAlign;
					C.textBaseline=E.textBaseline;
					C.fillText(str,x,y);
					break;
			}
			if(applyNewProperty){
				this.computeBoundingBox(K[i],E.type);
			}			
			delete E.$temp;

			this.$element[K[i]]=E;
			C.restore();
		}
	}
	Canvas.prototype.CopyObj=function(val){ //Object를 변경한다, 자바스크립트에서 object는 c의 포인터 같이 주소참조같은 효과
		if(!val){
			return {};
		}
		return JSON.parse(JSON.stringify(val));
	}



	Canvas.prototype.element=function(element){
		if(!this.$canvas){
			console.warn("CvSS ERROR : 캔버스가 등록 되지 않았습니다.");
			return;
		}
		if(typeof element=="string" || typeof element=="number"){
			this.$systemValue.STACK.push(String(element))
		}
		return this;
	}
	//element(element).cvss
	Canvas.prototype.cvss=function(info,/*optional*/val){
		var target=this.$systemValue.STACK.pop(),result;
		if(!this.$element[target]){
			console.warn("CvSS ERROR : 엘레먼트를 찾을 수 없습니다.");
			return;
		}
		var obj={};
		if((val || val=="") && typeof info=="string"){
			obj[target]=Canvas.prototype.CopyObj(this.$element[target]);
			obj[target][info]=val;
			this.drawElement(obj);						
		}else{
			if(Object.prototype.toString.call( info ) === '[object Array]'){
				var i,arr={};
				for(i=0; i<info.length; i++){
					arr[info[i]]=this.$element[target][info[i]];
				}
				return arr;
			}else if(typeof info=="object"){						
				obj[target]=Canvas.prototype.setBaseObj(this.$element[target],info,true);		
				this.drawElement(obj);
			}else{
				if(this.$element[target]){
					result=this.$element[target][info];
					if(result===undefined && this.$initElement[info]){
						result=this.$initElement[info];
					}
					if(typeof result=="object"){
						return Canvas.prototype.CopyObj(result);
					}	
					return result;
				}
			}
		}
	}
	Canvas.prototype.getInfo=function(){
		var target=this.$systemValue.STACK.pop();
		if(!this.$element[target]){
			console.warn("CvSS ERROR : not found element");
			return 0;
		}
		return Canvas.prototype.CopyObj(this.$element[target]);
	}
	//element(element).create({info})
	Canvas.prototype.create=function(info){
		var result=[],target=this.$systemValue.STACK.pop();
		result[target]=info;
		this.drawElement(result);
		return 1;
	}
	//element(element).remove();
	Canvas.prototype.remove=function(){
		var target=this.$systemValue.STACK.pop();
		if(!this.$element[target]){
			console.warn("CvSS ERROR : not found element");	
			return 0;
		}

		delete this.$element[target];
		delete this.$elementKey.splice(this.$elementKey.indexOf(target),1);
		delete this.$systemValue.EVENT[target];
		delete this.$systemValue.eventFunc[target];
		this.drawElement(this.$element);
	}
	Canvas.prototype.rename=function(nName){
		var target=this.$systemValue.STACK.pop();
		if(!this.$element[target]){
			console.warn("CvSS ERROR : not found element");	
			return 0;
		}
		if(this.$element[nName]){
			console.warn("CvSS ERROR : "+nName+"은(는) 이미 존재하는 이름입니다.");
			return 0;
		}
		this.$element[nName]=this.CopyObj(this.$element[target]);
		delete this.$element[target]

		var index=this.$elementKey.indexOf(target);
		this.$elementKey.splice(index,1);
		this.$elementKey.splice(index,0,nName);

		this.$systemValue.EVENT[nName]=this.CopyObj(this.$systemValue.EVENT[target]);
		delete this.$systemValue.EVENT[target];

		var key=Object.keys(typeof this.$systemValue.eventFunc[target]=="Object" ? this.$systemValue.eventFunc[target] : {});
		this.$systemValue.eventFunc[nName]={}
		for(var i=0; i<key.length; i++){
			this.$systemValue.eventFunc[nName]=this.$systemValue.eventFunc[target][key[i]]
		}
		delete this.$systemValue.eventFunc[target]

		this.drawElement(this.$element);
		return 1;
	}


	/*CvssElement Events*/
	Canvas.prototype.submitEvent=function(type,func){
		var target=this.$systemValue.STACK.pop();
		if(typeof type!="string"){return 0;}
		if(this.$systemValue.elementEventType.indexOf(type)==-1){return 0;}
		if(typeof func!="function"){return 0;}
		if(typeof this.$systemValue.eventFunc[target] !="object"){
			this.$systemValue.eventFunc[target]={};
		}
		this.$systemValue.eventFunc[target][type]=func;
	}
	Canvas.prototype.mousedown=function(func){this.submitEvent("mousedown",func);}
	Canvas.prototype.mouseup=function(func){this.submitEvent("mouseup",func);}
	Canvas.prototype.dblclick=function(func){this.submitEvent("dblclick",func);}
	Canvas.prototype.mousein=function(func){this.submitEvent("mousein",func);}
	Canvas.prototype.mouseout=function(func){this.submitEvent("mouseout",func);}
	Canvas.prototype.dragstart=function(func){this.submitEvent("dragstart",func);}
	Canvas.prototype.drag=function(func){this.submitEvent("drag",func);}
	Canvas.prototype.drop=function(func){this.submitEvent("drop",func);}
	Canvas.prototype.mousemove=function(func){this.submitEvent("mousemove",func);}

	//hover is mousein and mouseout event
	Canvas.prototype.hover=function(Infunc,/*optional*/Outfunc){
		if(typeof Infunc=="function"){this.submitEvent("mousein",Infunc);}
		if(typeof Outfunc=="function"){this.submitEvent("mouseout",Outfunc);}
	}
	Canvas.prototype.click=function(func){
		var target=this.$systemValue.STACK.pop();
		if(typeof this.$systemValue.eventFunc[target] !="object"){
			this.$systemValue.eventFunc[target]={};
		}
		this.$systemValue.eventFunc[target]["click"]=func;
	}
	Canvas.prototype.hide=function(func){
		var target=this.$systemValue.STACK.pop();
		if(this.$element[target]){
			this.$element[target].show=false;
			this.drawElement(this.$element);
		}
		return 0;
	}
	Canvas.prototype.show=function(func){
		var target=this.$systemValue.STACK.pop();
		if(this.$element[target]){
			this.$element[target].show=true;
			this.drawElement(this.$element);
		}
		return 0;
	}
	Canvas.prototype.bind=function(events,func){
		var target=this.$systemValue.STACK.pop();
		if(typeof events!="string"){console.warn("Cvss Warning : bind함수의 첫인자는 문자열입니다."); return 0;}
		events=events.split(" ");
		var i;
		for(i=0; i<events.length; i++){
			if(this.$systemValue.elementEventType.indexOf(events[i])==-1){continue;}
			this.submitEvent(events[i],func);
			this.$systemValue.STACK.push(target);
		}
	}
	Canvas.prototype.unbind=function(events){
		var sys=this.$systemValue;
		var target=sys.STACK.pop();
	
		if(typeof events!="string"){console.warn("Cvss Warning : unbind함수의 첫인자는 문자열입니다."); return 0;}
		events=events.split(" ");
		var i;
		for(i=0; i<events.length; i++){
			if(sys.elementEventType.indexOf(events[i])==-1){continue;}
			if(sys.eventFunc[target]){
				delete sys.eventFunc[target][events[i]];
				return 1;
			}
		}
		return 0;
	}
	Canvas.prototype.transform=function(type,value){
		if(Object.prototype.toString.call( value ) !== '[object Array]' && isNaN(Number(value[0])) && isNaN(Number(value[1]))){
			return
		}
		value[0]=Number(value[0])
		value[1]=Number(value[1])

		var matrix=[];
		var sysTarget=this.$systemValue.transform;

		switch(type){
			case "scale":
				sysTarget.scale=value;
				break;
			case "skew":
				sysTarget.skew=value;
				break;
			case "translate":
				sysTarget.translate=value;
				break;
		}
		return 0;
	}
	Canvas.prototype.computeBoundingBox=function(name,type){
		if(type=="circle" || type=="text"){return}
		var vertex=this.$systemValue.EVENT[name].vertex;
		var minX=Infinity
		var minY=Infinity			
		var maxX=-Infinity	
		var maxY=-Infinity

		for(var i=0; i<vertex.length; i++){
			if(vertex[i][0]<minX){
				minX=vertex[i][0];
			}
			if(vertex[i][1]<minY){
				minY=vertex[i][1];
			}		
			if(vertex[i][0]>maxX){
				maxX=vertex[i][0];
			}
			if(vertex[i][1]>maxY){
				maxY=vertex[i][1];
			}										
		}
		this.$systemValue.boundingBox[name]={
			left:minX,right:maxX,
			top:minY,bottom:maxY
		};
		return
	}	
	Canvas.prototype.transformForMatrix=function(a,b,c,d,e,f){
		if(typeof a=="number" && typeof b=="number" && typeof c=="number" && typeof d=="number" && typeof e=="number" && typeof f=="number"){
			this.transform("scale",[a,d]);
			this.transform("skew",[b,c]);
			this.transform("translate",[e,f]);
		}
		return;
	}
	Canvas.prototype.$initElement={
		zindex:0,
		type:"block",
		width:50,
		height:50,
		x:0,
		y:0,	
		background:"rgba(0,0,0,0)",
		opacity:1,
		origin:[0,0],
		r:10,
		start:0,
		end:2*Math.PI,
		clock:true,
		backgroundImageSrc:undefined,
		backgroundImagePattern:"no-repeat",
		backgroundImageX:0,
		backgroundImageY:0,
		cursor:"default",
		fontSize:12,
		fontFamily:"Arial",
		borderColor:"black",
		borderWidth:0,
		content:"",
		figure:true,
		rotate:0,
		rotateOriginX:0,
		rotateOriginY:0,
		scale:[1,1],
		translate:[0,0],
		textAlign:"start",
		textBaseline:"alphabetic",
		lineJoin:"round"
	};
}(window));//end