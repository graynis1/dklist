import React from "react";
import RightColumn from "./components/RightColumn";
import LeftColumn from "./components/LeftColumn";
import './style.css';

 
const OptionContainerComponent = ({data, setData, loading, rightColumnBody, rightColumnHeader, leftColumnContent, likeThis, scoreAction, addCommentAction, deleteCommentAction, editCommentAction, likeCommentAction, subCommentDeleteAction, subCommentEditAction, addSubCommentAction, multiLanguage = false}) => {
    
    
    return(
        <div className="optionProfileContainer">
            <LeftColumn data={data} setData={setData} loading={loading} leftColumnContent={leftColumnContent} likeThis={likeThis} scoreAction={scoreAction}/>
            <RightColumn multiLanguage={multiLanguage} data={data} setData={setData} loading={loading} rightColumnHeader={rightColumnHeader} rightColumnBody={rightColumnBody} addCommentAction={addCommentAction} deleteCommentAction={deleteCommentAction} editCommentAction={editCommentAction} likeCommentAction={likeCommentAction}  subCommentDeleteAction={subCommentDeleteAction} subCommentEditAction={subCommentEditAction} addSubCommentAction={addSubCommentAction}/>
        </div>
    )
}
export default OptionContainerComponent;